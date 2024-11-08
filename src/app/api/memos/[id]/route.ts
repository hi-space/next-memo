// src/app/api/memos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Next.js 13에서는 params를 비동기적으로 처리해야 합니다
    const id = await params.id;

    // 메모 정보 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: "Memos",
        Key: {
          id: id,
        },
      })
    );

    // S3에 업로드된 파일이 있다면 삭제
    if (getMemoResult.Item?.fileUrl) {
      const fileKey = getMemoResult.Item.fileUrl.split(".com/")[1];
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileKey,
        })
      );
    }

    // DynamoDB에서 메모 삭제
    await docClient.send(
      new DeleteCommand({
        TableName: "Memos",
        Key: {
          id: id,
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "메모 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = await params.id; // params.id를 await로 처리
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const newFile = formData.get("file") as File | null;

    // 기존 메모 정보 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: "Memos",
        Key: { id },
      })
    );

    const existingMemo = getMemoResult.Item;
    let fileUrl = existingMemo?.fileUrl;
    let fileName = existingMemo?.fileName;

    // 새 파일이 있다면 기존 파일 삭제 후 새 파일 업로드
    if (newFile) {
      // 기존 파일이 있다면 삭제
      if (existingMemo?.fileUrl) {
        const oldFileKey = existingMemo.fileUrl.split(".com/")[1];
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: oldFileKey,
          })
        );
      }

      // 새 파일 업로드
      fileName = newFile.name;
      const fileKey = `uploads/${id}-${fileName}`;
      const arrayBuffer = await newFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileKey,
          Body: buffer,
          ContentType: newFile.type,
        })
      );

      fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    }

    // UpdateExpression과 ExpressionAttributeValues를 조건부로 구성
    let updateExpression = "SET content = :content, updatedAt = :updatedAt";
    let expressionAttributeValues: any = {
      ":content": content,
      ":updatedAt": new Date().toISOString(),
    };

    if (fileName !== undefined) {
      updateExpression += ", fileName = :fileName, fileUrl = :fileUrl";
      expressionAttributeValues[":fileName"] = fileName;
      expressionAttributeValues[":fileUrl"] = fileUrl;
    }

    // 메모 업데이트
    await docClient.send(
      new UpdateCommand({
        TableName: "Memos",
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "메모 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

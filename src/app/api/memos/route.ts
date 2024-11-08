// src/app/api/memos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, generatePresignedUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const file = formData.get("file") as File;

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    let fileUrl = undefined;
    let fileName = undefined;

    if (file) {
      fileName = file.name;
      const fileKey = `uploads/${id}-${fileName}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileKey,
          Body: buffer,
          ContentType: file.type,
        })
      );

      fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    }

    await docClient.send(
      new PutCommand({
        TableName: "Memos",
        Item: {
          id,
          content,
          fileName,
          fileUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "메모 작성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: "Memos",
      })
    );

    // 각 메모의 fileUrl을 presigned URL로 변환
    const items = await Promise.all(
      (result.Items || []).map(async (item) => {
        if (item.fileUrl) {
          const fileKey = item.fileUrl.split(".com/")[1];
          item.fileUrl = await generatePresignedUrl(fileKey);
        }
        return item;
      })
    );

    // createdAt을 기준으로 내림차순 정렬
    const sortedItems = items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(sortedItems);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "메모 불러오기에 실패했습니다." },
      { status: 500 }
    );
  }
}

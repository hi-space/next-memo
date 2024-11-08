// src/app/api/memos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: process.env.AWS_REGION,
});

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
      new QueryCommand({
        TableName: "Memos",
        KeyConditionExpression: "id = :id",
        ScanIndexForward: false,
      })
    );

    return NextResponse.json(result.Items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "메모 불러오기에 실패했습니다." },
      { status: 500 }
    );
  }
}

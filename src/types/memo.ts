export interface FileInfo {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface Memo {
  type?: string; // DynamoDB에서 사용하는 파티션 키
  createdAt: string;
  updatedAt: string;
  id: string;
  content: string;
  files?: FileInfo[]; // 파일 정보 배열
  fileCount?: number; // 전체 파일 개수
  title?: string;
  summary?: string;
  tags?: string[];
}

export interface DocumentDto {
  id: string;
  name: string;
  status: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  status?: string;
}

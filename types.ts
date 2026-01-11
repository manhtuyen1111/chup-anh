
export interface InspectionData {
  containerId: string;
  team: string;
  timestamp: string;
}

export interface PhotoCapture {
  id: string;
  base64: string;
  analysis?: string;
  status: 'pending' | 'analyzing' | 'done';
}

export interface CompletedInspection extends InspectionData {
  id: string;
  photoCount: number;
}

export enum AppStep {
  FORM = 'FORM',
  CAMERA = 'CAMERA',
  REVIEW = 'REVIEW',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  REPORTS = 'REPORTS'
}

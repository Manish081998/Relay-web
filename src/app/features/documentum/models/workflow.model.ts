export interface WorkflowState {
  edgeOrderStateId: number;
  orderSeq: number;
  currentQueueId: number;
  queueName: string;
  isAcquired: boolean;
  acquiredBy: string | null;
  acquiredByName: string | null;
  stageChangeDate: string | null;
  completionDate: string | null;
  createdDate: string;
  startedOn: string;
}

export interface WorkflowHistoryItem {
  activityName: string;
  comments: string;
  userName: string;
  timestamp: string;
  eventType: string;
  orderStatus: string | null;
}

export interface WorkflowActionResult {
  success: boolean;
  message: string;
}

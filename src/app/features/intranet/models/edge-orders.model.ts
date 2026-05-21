export interface EdgeOrderDto {
  releaseNumber:    string;
  releaseName:      string;
  accountNumber:    string;
  name:             string;
  repPO:            string;
  lineItems:        string | number;
  totalNet:         string | number;
  emailId:          string;
  marketingProgram: string;
  orderRecdDate:    string;
  xmlMacPacOrder:   string;
  brand:            string;
  orderSource:      string;
}

export interface EdgeOrderSearchParams {
  EmailId?:       string;
  ReleaseNumber?: string;
  RepPO?:         string;
  PcUserName?:    string;
  RecordedDate?:  string;
  ReleaseName?:   string;
  PageNumber?:    number;
  PageSize?:      number;
}

export interface EdgeOrdersPagedResponse {
  items:      EdgeOrderDto[];
  totalCount: number;
  pageNumber: number;
  pageSize:   number;
}

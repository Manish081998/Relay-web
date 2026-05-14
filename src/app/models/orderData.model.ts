
export interface OrderData {
  repAccountNo: string;
  repPhone: string;
  repFax: string;
  program: string;
  programCode: string;
  totalNetWoFrt: string;
  soldToName: string;
  soldToAddress: string;
  soldToCity: string;
  soldToState: string;
  soldToZip: string;
  shipToName: string;
  shipToCareOf: string;
  shipToAddress: string;
  shipToAddress2: string;
  shipToCity: string;
  shipToState: string;
  shipToZip: string;
  repPONo: string;
  jobName: string;
  custAccountNo: string;
  custPO: string;
  salesperson: string;
  fma: string;
  specialItems: string;
  xLines: string;
  commLines: string;
  markOrder: string;
  callBefore: string;
  shippingInstructions: string;
  terms: string;
  shipVia: string;
  noPartial: string;
  releaseComments: string;
  modelCount: string;
  jobNumber: string;
  jobCreated: string;
  lineCount: string;
  edgeVersion: string;
  email: string;
  ctrlQty: string;
  jobGuid: string;
  freightQuoteNumber: string;
  /** Identifies which XML schema produced this order; drives table rendering. */
  xmlType: 'titusgrd' | 'tnbheader' | 'titusterminal' | 'generic';
  /** Each element is a map of column-key → display value, keyed by OrderTypeConfig.columns[].key */
  lineItems: Record<string, string>[];
  /** Generic type only: per-model option name/value pairs sorted by option_order. Index-parallel with lineItems. */
  lineItemOptions?: Array<{ name: string; value: string }[]>;
  baseOrderCost: string;
  setupCharge: string;
  freight: string;
  totalOrderCost: string;
  totalListPrice: string;
}

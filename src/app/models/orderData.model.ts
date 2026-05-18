
export interface SdaItem {
  userName: string;
  sdaNumber: string;
  category: string;
  productName: string;
  discountGroup: string;
  productQty: string;
  listPrice: string;
  reqMultiplier: string;
  appNet: string;
  isReleased: string;
}

export interface OrderSection {
  /** Matches OrderTypeConfig.id — drives which table config to use when rendering. */
  xmlType: string;
  lineItems: Record<string, string>[];
  /** Generic type only: per-model option name/value pairs sorted by option_order. Index-parallel with lineItems. */
  lineItemOptions?: Array<{ name: string; value: string }[]>;
  /** KRU block-layout only: per-model field key→value map, index-parallel with lineItems. */
  lineItemBlockFields?: Array<Record<string, string>>;
}

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
  /** One element per product-type section found in the XML (e.g. TitusGRD, TitusTerminal). */
  sections: OrderSection[];
  sdaBrandName: string;
  sdaExpireDate: string;
  sdaVersion: string;
  sdaPaNotes: string;
  sdaItems: SdaItem[];
  baseOrderCost: string;
  setupCharge: string;
  freight: string;
  totalOrderCost: string;
  totalListPrice: string;
}

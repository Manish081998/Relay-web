export interface HeaderCell {
  label: string;
  rowspan?: number;
  colspan?: number;
}

export interface TableColumn {
  key: string;       // property key on the parsed Record<string, string>
  label: string;     // display label for simple (single-row) headers
  xmlTags: string[]; // XML element names to try in order; first non-empty wins
  align: 'left' | 'center' | 'right';
  widthPct: number;  // <col> width as a percentage
}

export interface OrderTypeConfig {
  id: 'titusgrd' | 'tnbheader' | 'titusterminal' | 'generic';
  /** When 'block', Page 2 renders a per-model card layout instead of a flat table. Omit for table (default). */
  renderMode?: 'table' | 'block';
  /** CSS selector used to find Group elements in the XML */
  groupSelector: string;
  /** Drives both XML parsing and body-cell rendering */
  columns: TableColumn[];
  /** Each inner array is one <tr> in <thead>. Cells omitted when covered by rowspan above. */
  headerRows: HeaderCell[][];
}

// ── TitusGRD — XML1 / XML2 ───────────────────────────────────────────────────
// Handles both legacy TitusGRD wrapper and newer LineItems wrapper via comma
// selector. Priority tags: legacy (DimOne) first, new-API (WIDTH) fallback.
const TITUSGRD_COLUMNS: TableColumn[] = [
  { key: 'line',          label: 'Line',         xmlTags: ['Line'],                           align: 'center', widthPct: 4  },
  { key: 'qty',           label: 'Qty',          xmlTags: ['Qty'],                            align: 'center', widthPct: 4  },
  { key: 'model',         label: 'Model',        xmlTags: ['Model'],                          align: 'left',   widthPct: 10 },
  { key: 'dimOne',        label: 'Dim 1',        xmlTags: ['DimOne', 'WIDTH'],                align: 'center', widthPct: 5  },
  { key: 'dimTwo',        label: 'Dim 2',        xmlTags: ['DimTwo', 'HEIGHT'],               align: 'center', widthPct: 5  },
  { key: 'modSize',       label: 'Module Size',  xmlTags: ['ModSize_Border_Plen', 'MODULE'],  align: 'center', widthPct: 6  },
  { key: 'frameBorder',   label: 'Frame',        xmlTags: ['FrameBorder', 'BORDER'],          align: 'center', widthPct: 5  },
  { key: 'finish',        label: 'Finish',       xmlTags: ['Finish', 'FINISH'],               align: 'center', widthPct: 5  },
  { key: 'fastenPattern', label: 'Fastener',     xmlTags: ['FastenPattern', 'MOUNTING'],      align: 'center', widthPct: 6  },
  { key: 'damper',        label: 'Damper Model', xmlTags: ['Damper', 'DAMPER'],               align: 'center', widthPct: 6  },
  { key: 'accOne',        label: 'Acc 1',        xmlTags: ['AccOne', 'ACC1'],                 align: 'center', widthPct: 5  },
  { key: 'accTwo',        label: 'Acc 2',        xmlTags: ['AccTwo', 'ACC2'],                 align: 'center', widthPct: 5  },
  { key: 'accThree',      label: 'Acc 3',        xmlTags: ['AccThree', 'ACC3'],               align: 'center', widthPct: 5  },
  { key: 'priceEach',     label: 'Price Each',   xmlTags: ['IndividualPrice'],                align: 'right',  widthPct: 9  },
  { key: 'totalPrice',    label: 'Total Price',  xmlTags: ['TotalCost'],                      align: 'right',  widthPct: 10 },
];

// 3-row header matches the PDF layout (rowspan covers row 2 and 3 for most columns).
const TITUSGRD_HEADER: HeaderCell[][] = [
  [
    { label: 'Line',         rowspan: 3 },
    { label: 'Qty',          rowspan: 3 },
    { label: 'Model',        rowspan: 3 },
    { label: 'Dim 1',        rowspan: 3 },
    { label: 'Dim 2',        rowspan: 3 },
    { label: 'Module Size'              },  // rowspan 1; sub-rows fill below
    { label: 'Frame',        rowspan: 3 },
    { label: 'Finish',       rowspan: 3 },
    { label: 'Fastener',     rowspan: 2 },
    { label: 'Damper Model', rowspan: 2 },
    { label: 'Accessories', rowspan: 3, colspan: 3 },
    { label: 'Price Each',   rowspan: 3 },
    { label: 'Total Price',  rowspan: 3 },
  ],
  [
    { label: 'End Border' },
  ],
  [
    { label: 'Plenum Inlet' },
    { label: 'Pattern' },
    { label: 'Angle Cut' },
  ],
];

export const TITUSGRD_CONFIG: OrderTypeConfig = {
  id: 'titusgrd',
  groupSelector: 'LineItems > Group, TitusGRD > Group',
  columns: TITUSGRD_COLUMNS,
  headerRows: TITUSGRD_HEADER,
};

// ── TnBHeader0 — XML3 ────────────────────────────────────────────────────────
// 20 physical columns matching the PDF layout left-to-right.
// Each product type fills a different subset; empty cells render blank.
// Actual XML tag names: Ga1Dim1/Ga1Dim2 (not Ga1Width/Ga1Height).
// Col 6 tries Ga1Dim1 first (PR width), then Gp4NeckSizePc (SRD neck size).
// Col 7 tries Ga1Dim2 first (PR height), then Ga2RoundNeck (SRD round duct).
const TNBHEADER_COLUMNS: TableColumn[] = [
  { key: 'line',         label: 'Line',         xmlTags: ['Line'],                                       align: 'center', widthPct: 3 },
  { key: 'qty',          label: 'Qty',          xmlTags: ['Qty'],                                        align: 'center', widthPct: 3 },
  { key: 'model',        label: 'Model',        xmlTags: ['Model'],                                      align: 'left',   widthPct: 8 },
  { key: 'control',      label: 'Air Pattern',  xmlTags: ['Gd7AirPatternM'],                             align: 'center', widthPct: 5 },
  { key: 'bladePattern', label: 'Bar Pattern',  xmlTags: ['Ga1DrumSize'],                                align: 'center', widthPct: 5 },
  { key: 'dim1',         label: 'Width',        xmlTags: ['Ga1Dim1', 'Ga1Width', 'Ga1Length', 'Gp4NeckSizePc', 'Ga2SquareNeck'], align: 'center', widthPct: 5 },
  { key: 'dim2',         label: 'Height',       xmlTags: ['Ga1Dim2', 'Ga1Height', 'Ga2RoundNeck'],                               align: 'center', widthPct: 5 },
  { key: 'defPattern',   label: 'Def Pattern',  xmlTags: ['Gd7DefPatternM'],                             align: 'center', widthPct: 5 },
  { key: 'margin',       label: 'Margin Style', xmlTags: ['Ga3Margin'],                                  align: 'center', widthPct: 5 },
  { key: 'module',       label: 'Module Size',  xmlTags: ['Ga4ModuleFixed', 'Ga4ModuleUnfixed'],         align: 'center', widthPct: 5 },
  { key: 'hinge',        label: 'Hinge/Cable',  xmlTags: ['GpHingeLocation', 'GpCableLength'],           align: 'center', widthPct: 5 },
  { key: 'fastening',    label: 'Fast. Style',  xmlTags: ['Gg5ScrewHoles'],                              align: 'center', widthPct: 5 },
  { key: 'filterFrame',  label: 'Filter Frame', xmlTags: ['GgFilterFrame'],                              align: 'center', widthPct: 5 },
  { key: 'damper',       label: 'Damper',       xmlTags: ['GaaDamper'],                                  align: 'center', widthPct: 4 },
  { key: 'accy1',        label: 'Accy 1',       xmlTags: ['Gd5Accessories1', 'Gg6MountingFrame45'],      align: 'center', widthPct: 4 },
  { key: 'accy2',        label: 'Accy 2',       xmlTags: ['Gd5Accessories2'],                            align: 'center', widthPct: 4 },
  { key: 'accy3',        label: 'Accy 3',       xmlTags: ['Gd5Accessories3'],                            align: 'center', widthPct: 4 },
  { key: 'finish',       label: 'Finish',       xmlTags: ['Ga9Finish'],                                  align: 'center', widthPct: 4 },
  { key: 'priceEach',    label: 'Price Each',   xmlTags: ['IndividualPrice'],                            align: 'right',  widthPct: 8 },
  { key: 'totalPrice',   label: 'Total Price',  xmlTags: ['TotalCost'],                                  align: 'right',  widthPct: 8 },
];

// 4-row header matching the PDF exactly.
// Cols 1-3 and 18-20 span all 4 rows.
// Module(s) Size spans rows 2-4 (rowspan=3); Damper spans rows 2-3 (rowspan=2).
const TNBHEADER_HEADER: HeaderCell[][] = [
  // ── Row 1: top-level group labels ──────────────────────────────────────────
  [
    { label: 'Line',        rowspan: 4 },
    { label: 'Qty',         rowspan: 4 },
    { label: 'Model',       rowspan: 4 },
    { label: 'Control'      },   // col 4
    { label: 'Blade Pattern'},   // col 5
    { label: ''             },   // col 6
    { label: ''             },   // col 7
    { label: 'Def Pattern'  },   // col 8
    { label: ''             },   // col 9
    { label: ''             },   // col 10
    { label: ''             },   // col 11
    { label: 'Fastening style',rowspan: 2    },   // col 12
    { label: 'Filter Frame' },   // col 13
    { label: ''             },   // col 14
    { label: ''             },   // col 15
    { label: ''             },   // col 16
    { label: ''             },   // col 17
    { label: 'Finish',      rowspan: 4 },
    { label: 'Price Each',  rowspan: 4 },
    { label: 'Total Price', rowspan: 4 },
  ],
  // ── Row 2 ──────────────────────────────────────────────────────────────────
  [
    { label: 'Air Pattern'             },   // col 4
    { label: 'Bar Pattern'             },   // col 5
    { label: 'Width'                   },   // col 6
    { label: 'Height'                  },   // col 7
    { label: 'Adj Type'                },   // col 8
    { label: ''                        },   // col 9
    { label: 'Module(s) Size', rowspan: 2}, // col 10 — spans rows 2-4
    { label: 'Hinge Location'  ,rowspan: 2        },   // col 11
    { label: 'Sleeve'                   },   // col 12
    { label: 'Damper',          rowspan: 2                 },   // col 13
    
    { label: 'Accy 1',           rowspan: 2                 },   // col 15
    { label: 'Accy 2' ,           rowspan: 2                 },   // col 16
    { label: 'Accy 3',           rowspan: 2                  },   // col 17
  ],
  // ── Row 3 — col 10 covered by Module rowspan; col 14 by Damper rowspan ─────
  [
    { label: 'Plaque'       },   // col 4
    { label: 'Drum SZ/ EndCap Style'     },   // col 5
    { label: 'Length'       },   // col 6
    { label: ''        },   // col 7
    { label: 'Slots'        },   // col 8
    { label: 'Margin Style' },   // col 9
    // col 10 covered
    { label: ''             },   // col 12
    { label: 'Element(s)'   },   // col 13
    // col 14 covered
    { label: ''             },   // col 15
  ],
  // ── Row 4 — col 10 covered by Module rowspan ────────────────────────────────
  [
    { label: 'Shock-Vibe'   },   // col 4
    { label: '' },   // col 5
    { label: 'Square Neck'  },   // col 6
    { label: 'Round Duct Size'    },   // col 7
    { label: 'Material'     },   // col 8
    { label: ''             },   // col 9
    // col 10 covered
    { label: 'Cable Length' },   // col 11

    { label: 'Transformer'  },   // col 11
    { label: 'Return Width' },   // col 12
    { label: 'Return Height'},   // col 13
    { label: 'Insulation'   },   // col 14
    { label: 'CFM'          },   // col 15
    { label: 'T-Stat'         },   // col 16
    { label: 'Cable length'       },   // col 17
  ],
];

export const TNBHEADER_CONFIG: OrderTypeConfig = {
  id: 'tnbheader',
  groupSelector: 'TnBHeader0 > Group',
  columns: TNBHEADER_COLUMNS,
  headerRows: TNBHEADER_HEADER,
};

// ── TitusTerminal — XML5 ─────────────────────────────────────────────────────
// 41 physical columns matching the PDF layout left-to-right.
// Column order: Line/Qty/Model → Sensor-Casing → ColdInlet-FanBoxInlet → >-Duct-Motor
//   → CtrlType-HotCtrl-ActType → CFM group → Control Acc(3) → Unit Acc(5)
//   → WaterCoil/ElecCoil/KW → Coil Acc(4) → Price/Total.
// Row 1 header: 29 cells (rowspan=2 singles + 3 colspan groups).
// Row 2 header: 12 sub-labels only (1-3, 1-5, 1-4).
const TITUSTERMINAL_COLUMNS: TableColumn[] = [
  { key: 'line',        label: 'Line',         xmlTags: ['Line'],              align: 'center', widthPct: 2 },
  { key: 'qty',         label: 'Qty',          xmlTags: ['Qty'],               align: 'center', widthPct: 2 },
  { key: 'model',       label: 'Model',        xmlTags: ['Model'],             align: 'left',   widthPct: 5 },
  { key: 'sensor',      label: 'Sensor',       xmlTags: ['SensorCode'],        align: 'center', widthPct: 3 },
  { key: 'unitConfig',  label: 'Unit Cfg',     xmlTags: ['UnitConfig'],        align: 'center', widthPct: 3 },
  { key: 'liner',       label: 'Liner',        xmlTags: ['LinerOption'],       align: 'center', widthPct: 2 },
  { key: 'casing',      label: 'Casing',       xmlTags: ['CasingConfig'],      align: 'center', widthPct: 3 },
  { key: 'coldInlet',   label: 'Cold Inlet',   xmlTags: ['ColdInlet'],         align: 'center', widthPct: 2 },
  { key: 'hotInlet',    label: 'Hot Inlet',    xmlTags: ['HotInlet'],          align: 'center', widthPct: 2 },
  { key: 'unitSize',    label: 'Unit Size',    xmlTags: ['UnitSize'],          align: 'center', widthPct: 3 },
  { key: 'fanBoxInlet', label: 'Fan Box Inlet',xmlTags: ['FanBoxInletSize'],   align: 'center', widthPct: 2 },
  { key: 'inletSize',   label: '>Inlet Size',   xmlTags: ['DuctInletSize'],     align: 'center', widthPct: 2 },
  { key: 'ductType',    label: 'Duct Size',         xmlTags: ['DuctType'],          align: 'center', widthPct: 2 },
  { key: 'motorSize',   label: 'Motor',        xmlTags: ['MotorSize'],         align: 'center', widthPct: 2 },
  { key: 'ctrlType',    label: 'Ctrl Type',    xmlTags: ['ControlType'],       align: 'center', widthPct: 3 },
  { key: 'coldCtrl',    label: 'Cold Ctrl',    xmlTags: ['ColdCtrl'],          align: 'center', widthPct: 2 },
  { key: 'hotCtrl',     label: 'Hot Ctrl',     xmlTags: ['HotCtrl'],           align: 'center', widthPct: 2 },
  { key: 'actType',     label: 'Act Type',     xmlTags: ['ActType'],           align: 'center', widthPct: 3 },
  { key: 'maxCfm',      label: 'Max CFM',      xmlTags: ['MaxCfm'],            align: 'center', widthPct: 3 },
  { key: 'maxCfmCold',  label: 'Max CFM Cold', xmlTags: ['MaxCfmCold'],        align: 'center', widthPct: 2 },
  { key: 'minCfm',      label: 'Min CFM',      xmlTags: ['MinCfm'],            align: 'center', widthPct: 3 },
  { key: 'fanCfm',      label: 'Fan CFM',      xmlTags: ['FanCfm'],            align: 'center', widthPct: 2 },
  { key: 'maxCfmHot',   label: 'Max CFM Hot',  xmlTags: ['MaxCfmHot'],         align: 'center', widthPct: 2 },
  { key: 'ctrlAcc1',    label: 'Ctrl Acc 1',   xmlTags: ['CtrlAccOne'],        align: 'center', widthPct: 2 },
  { key: 'ctrlAcc2',    label: 'Ctrl Acc 2',   xmlTags: ['CtrlAccTwo'],        align: 'center', widthPct: 2 },
  { key: 'ctrlAcc3',    label: 'Ctrl Acc 3',   xmlTags: ['CtrlAccThree'],      align: 'center', widthPct: 2 },
  { key: 'unitAcc1',    label: 'Unit Acc 1',   xmlTags: ['UnitAccOne'],        align: 'center', widthPct: 2 },
  { key: 'unitAcc2',    label: 'Unit Acc 2',   xmlTags: ['UnitAccTwo'],        align: 'center', widthPct: 2 },
  { key: 'unitAcc3',    label: 'Unit Acc 3',   xmlTags: ['UnitAccThree'],      align: 'center', widthPct: 2 },
  { key: 'unitAcc4',    label: 'Unit Acc 4',   xmlTags: ['UnitAccFour'],       align: 'center', widthPct: 2 },
  { key: 'unitAcc5',    label: 'Unit Acc 5',   xmlTags: ['UnitAccFive'],       align: 'center', widthPct: 2 },
  { key: 'waterCoil',   label: 'Water Coil',   xmlTags: ['WaterCoil'],         align: 'center', widthPct: 2 },
  { key: 'elecCoil',    label: 'Elec Coil',    xmlTags: ['ElecCoilType'],      align: 'center', widthPct: 2 },
  { key: 'kw',          label: 'KW',           xmlTags: ['Kw'],                align: 'center', widthPct: 2 },
  { key: 'coilAcc1',    label: 'Coil Acc 1',   xmlTags: ['CoilAccOne'],        align: 'center', widthPct: 2 },
  { key: 'coilAcc2',    label: 'Coil Acc 2',   xmlTags: ['CoilAccTwo'],        align: 'center', widthPct: 2 },
  { key: 'coilAcc3',    label: 'Coil Acc 3',   xmlTags: ['CoilAccThree'],      align: 'center', widthPct: 2 },
  { key: 'coilAcc4',    label: 'Coil Acc 4',   xmlTags: ['CoilAccFour'],       align: 'center', widthPct: 2 },
  { key: 'priceEach',   label: 'Price Each',   xmlTags: ['IndividualPrice'],   align: 'right',  widthPct: 4 },
  { key: 'totalPrice',  label: 'Total Price',  xmlTags: ['TotalCost'],         align: 'right',  widthPct: 4 },
];

const TITUSTERMINAL_HEADER: HeaderCell[][] = [
  // ── Row 1: 29 cells — singles have rowspan=2; grouped spans have colspan ─────
  [
    { label: 'Line',         rowspan: 2 },
    { label: 'Qty',          rowspan: 2 },
    { label: 'Model',        rowspan: 2 },
    { label: 'Sensor',       rowspan: 2 },
    { label: 'Unit Cfg',     rowspan: 2 },
    { label: 'Liner',        rowspan: 2 },
    { label: 'Casing',       rowspan: 2 },
    { label: 'Cold Inlet',   rowspan: 2 },
    { label: 'Hot Inlet',    rowspan: 2 },
    { label: 'Unit Size',    rowspan: 2 },
    { label: 'Fan Box Inlet',rowspan: 2 },
    { label: '>Inlet Size',   rowspan: 2 },
    { label: 'Duct Size',         rowspan: 2 },
    { label: 'Motor',        rowspan: 2 },
    { label: 'Ctrl Type',    rowspan: 2 },
    { label: 'Cold Ctrl',    rowspan: 2 },
    { label: 'Hot Ctrl',     rowspan: 2 },
    { label: 'Act Type',     rowspan: 2 },
    { label: 'Max CFM',      rowspan: 2 },
    { label: 'Max CFM Cold', rowspan: 2 },
    { label: 'Min CFM',      rowspan: 2 },
    { label: 'Fan CFM',      rowspan: 2 },
    { label: 'MAX CFM Hot',  rowspan: 2 },
    { label: 'Control Acc',  colspan: 3  },
    { label: 'Unit Acc',     colspan: 5  },
    { label: 'Water Coil',   rowspan: 2 },
    { label: 'Elec Coil',    rowspan: 2 },
    { label: 'KW',           rowspan: 2 },
    { label: 'Coil Acc.',    colspan: 4  },
    { label: 'Price Each',   rowspan: 2 },
    { label: 'Total Price',  rowspan: 2 },
  ],
  // ── Row 2: sub-labels under Control Acc, Unit Acc, Coil Acc. only ────────────
  [
    { label: '1' }, { label: '2' }, { label: '3' },                                  // Control Acc
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }, { label: '5' },  // Unit Acc
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' },                  // Coil Acc.
  ],
];

export const TITUSTERMINAL_CONFIG: OrderTypeConfig = {
  id: 'titusterminal',
  groupSelector: 'TitusTerminal > Group',
  columns: TITUSTERMINAL_COLUMNS,
  headerRows: TITUSTERMINAL_HEADER,
};

// ── Generic — XML with <Generic><Group><ModelConfig><options> structure ───────
// Per-model pricing row only; full configuration is rendered via block layout.
const GENERIC_COLUMNS: TableColumn[] = [
  { key: 'line',      label: 'LI',         xmlTags: ['Line'],            align: 'center', widthPct: 5  },
  { key: 'qty',       label: 'Qty',        xmlTags: ['Qty'],             align: 'center', widthPct: 5  },
  { key: 'mktgPgm',  label: 'Mktg Pgm',   xmlTags: ['MP'],              align: 'left',   widthPct: 15 },
  { key: 'list',      label: 'List',       xmlTags: ['IndividualPrice'], align: 'right',  widthPct: 15 },
  { key: 'mult1',     label: 'Mult1',      xmlTags: ['Multiplier'],      align: 'center', widthPct: 20 },
  { key: 'net',       label: 'Net',        xmlTags: ['TotalCost'],       align: 'right',  widthPct: 15 },
  { key: 'freight',   label: 'Freight',    xmlTags: ['Freight'],         align: 'right',  widthPct: 12 },
  { key: 'totalSell', label: 'Total Sell', xmlTags: ['TotalSell'],       align: 'right',  widthPct: 13 },
];

export const GENERIC_CONFIG: OrderTypeConfig = {
  id: 'generic',
  renderMode: 'block',
  groupSelector: 'Generic > Group',
  columns: GENERIC_COLUMNS,
  headerRows: [],
};

/** Detects which config applies by inspecting the parsed TTS element. */
export function detectOrderConfig(tts: Element): OrderTypeConfig {
  if (tts.querySelector('TitusTerminal')) return TITUSTERMINAL_CONFIG;
  if (tts.querySelector('TnBHeader0')) return TNBHEADER_CONFIG;
  if (tts.querySelector('Generic')) return GENERIC_CONFIG;
  return TITUSGRD_CONFIG;
}

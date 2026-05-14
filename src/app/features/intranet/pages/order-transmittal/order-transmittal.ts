import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { OrderData } from 'src/app/models/orderData.model';
import {
  OrderTypeConfig,
  TITUSGRD_CONFIG,
  detectOrderConfig,
} from '../../models/order-config.model';

@Component({
  selector: 'app-order-transmittal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-transmittal.html',
  styleUrl: './order-transmittal.scss',
})
export class OrderTransmittal implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly titleSvc  = inject(Title);
  private readonly elRef     = inject(ElementRef);

  readonly order              = signal<OrderData | null>(null);
  readonly config             = signal<OrderTypeConfig>(TITUSGRD_CONFIG);
  readonly parseError         = signal('');
  readonly releaseNumber      = signal('');
  readonly printDate          = signal('');
  readonly searchQuery        = signal('');
  readonly currentMatchIndex  = signal(-1);
  readonly markTotal          = signal(0);

  ngOnInit(): void {
    this.printDate.set(new Date().toLocaleDateString('en-US'));

    const key = this.route.snapshot.queryParamMap.get('key');
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored) as { xml?: string; releaseNumber?: string };
        this.releaseNumber.set(data.releaseNumber ?? '');
        if (data.xml) {
          this.parseXml(data.xml);
          return;
        }
      }
    }

    const state = history.state as { xml?: string; releaseNumber?: string };
    this.releaseNumber.set(state?.releaseNumber ?? '');
    if (state?.xml) {
      this.parseXml(state.xml);
    } else {
      this.parseError.set('No XML content received. Please go back and click a release number.');
    }
  }

  goBack(): void { window.close(); }
  print(): void  { window.print(); }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentMatchIndex.set(-1);
    this.markTotal.set(0);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.navigateToMatch(event.shiftKey ? -1 : 1);
  }

  navigateToMatch(direction: 1 | -1 = 1): void {
    const marks = Array.from(
      this.elRef.nativeElement.querySelectorAll('mark.ot-hl'),
    ) as HTMLElement[];
    if (!marks.length) return;
    marks.forEach(m => m.classList.remove('ot-hl-active'));
    const total = marks.length;
    this.markTotal.set(total);
    const current = this.currentMatchIndex();
    const next = current < 0 && direction === 1
      ? 0
      : ((current + direction) % total + total) % total;
    this.currentMatchIndex.set(next);
    marks[next].classList.add('ot-hl-active');
    marks[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hl(text: string | null | undefined): string {
    const escaped = this.escHtml(text ?? '');
    const q = this.searchQuery().trim();
    if (!q) return escaped;
    return escaped.replace(
      new RegExp(this.escRe(q), 'gi'),
      (m: string) => `<mark class="ot-hl">${m}</mark>`,
    );
  }

  private q(el: Element | Document, selector: string): string {
    return el.querySelector(selector)?.textContent?.trim() ?? '';
  }

  /** Returns the first non-empty text value found among the given XML tag names. */
  private firstOf(mc: Element, tags: string[]): string {
    for (const tag of tags) {
      const val = mc.querySelector(tag)?.textContent?.trim();
      if (val) return val;
    }
    return '';
  }

  private parseXml(raw: string): void {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, 'application/xml');
      if (doc.querySelector('parsererror')) {
        this.parseError.set('Invalid XML content.');
        return;
      }

      const tts = doc.querySelector('TTS');
      if (!tts) {
        this.parseError.set('Unexpected XML structure: missing TTS element.');
        return;
      }

      // Detect schema type and select corresponding config.
      const cfg = detectOrderConfig(tts);
      this.config.set(cfg);

      // Parse line items using the config's column definitions.
      const lineItems: Record<string, string>[] = Array.from(
        tts.querySelectorAll(cfg.groupSelector),
      ).map((group) => {
        const mc = group.querySelector('ModelConfig')!;
        const item: Record<string, string> = {};

        for (const col of cfg.columns) {
          item[col.key] = this.firstOf(mc, col.xmlTags);
        }

        // Meta fields shared by all types — not rendered as table columns.
        item['tag']        = this.q(mc, 'TagText') || this.q(mc, 'Tag');
        item['comment']    = this.q(mc, 'Comment');
        item['multiplier'] = this.q(mc, 'Multiplier');
        item['model']      = this.firstOf(mc, ['Model']);

        return item;
      });

      // Generic type: extract per-model <options> into a parallel array.
      const lineItemOptions = cfg.id === 'generic'
        ? Array.from(tts.querySelectorAll(cfg.groupSelector)).map(group => {
            const mc = group.querySelector('ModelConfig')!;
            return Array.from(mc.querySelectorAll('options > option'))
              .map(opt => ({
                name:  opt.querySelector('option_name')?.textContent?.trim() ?? '',
                value: opt.querySelector('option_value')?.textContent?.trim() ?? '',
                order: parseInt(opt.querySelector('option_order')?.textContent?.trim() ?? '0', 10),
              }))
              .filter(o => o.name !== '')
              .sort((a, b) => a.order - b.order)
              .map(({ name, value }) => ({ name, value }));
          })
        : undefined;

      const parsedOrder: OrderData = {
        repAccountNo:         this.q(tts, 'Brand AccountInfo RepAccountNo'),
        repPhone:             this.q(tts, 'Brand AccountInfo Phone'),
        repFax:               this.q(tts, 'Brand AccountInfo Fax'),
        program:              this.q(tts, 'MarketingProgram Program'),
        programCode:          this.q(tts, 'MarketingProgram ProgramCode'),
        totalNetWoFrt:        this.q(tts, 'PricingTotals NetMinusFreight'),
        soldToName:           this.q(tts, 'Address SoldTo Name1'),
        soldToAddress:        this.q(tts, 'Address SoldTo Street1'),
        soldToCity:           this.q(tts, 'Address SoldTo City'),
        soldToState:          this.q(tts, 'Address SoldTo State'),
        soldToZip:            this.q(tts, 'Address SoldTo Zip'),
        shipToName:           this.q(tts, 'Address ShipTo Name1'),
        shipToCareOf:         this.q(tts, 'Address ShipTo careof'),
        shipToAddress:        this.q(tts, 'Address ShipTo Street1'),
        shipToAddress2:       this.q(tts, 'Address ShipTo Street2'),
        shipToCity:           this.q(tts, 'Address ShipTo City'),
        shipToState:          this.q(tts, 'Address ShipTo State'),
        shipToZip:            this.q(tts, 'Address ShipTo Zip'),
        repPONo:              this.q(tts, 'OrderInfo RepPONo'),
        jobName:              this.q(tts, 'OrderInfo JobName'),
        custAccountNo:        this.q(tts, 'OrderInfo CustAccountNo'),
        custPO:               this.q(tts, 'OrderInfo CustomerPONo'),
        salesperson:          this.q(tts, 'OrderInfo SalesPerson'),
        jobGuid:              this.q(tts, 'OrderInfo JobGuid'),
        fma:                  this.q(tts, 'SpecialInfo FMA'),
        specialItems:         this.q(tts, 'SpecialItems IsSpecial'),
        xLines:               this.q(tts, 'SpecialItems XLines'),
        commLines:            this.q(tts, 'SpecialItems CommLines'),
        markOrder:            this.q(tts, 'Shipping ShippingMethod MarkOrder'),
        callBefore:           this.q(tts, 'Shipping ShippingMethod CallBeforeDelivery'),
        shippingInstructions: this.q(tts, 'Shipping ShippingMethod ShippingInstructions'),
        terms:                this.q(tts, 'Shipping ShippingMethod Terms'),
        shipVia:              this.q(tts, 'Shipping ShippingMethod ShipVia'),
        noPartial:            this.q(tts, 'Shipping ShippingMethod NoPartial'),
        releaseComments:      this.q(tts, 'Shipping ShippingCharges CommentsToFactory'),
        modelCount:           this.q(tts, 'QuantityInfo ModelCount'),
        jobNumber:            this.q(tts, 'QuantityInfo JobNumber'),
        jobCreated:           this.q(tts, 'QuantityInfo JobInitiatedDate'),
        lineCount:            this.q(tts, 'QuantityInfo LineCount'),
        edgeVersion:          this.q(tts, 'QuantityInfo VersionNumber'),
        email:                this.q(tts, 'QuantityInfo email'),
        ctrlQty:              this.q(tts, 'SpecialItems CtrlQty'),
        freightQuoteNumber:   this.q(tts, 'PricingTotals FreightQuoteNumber'),
        xmlType:              cfg.id,
        lineItems,
        lineItemOptions,
        baseOrderCost:        this.q(tts, 'PricingTotals BaseOrderCost'),
        setupCharge:          this.q(tts, 'PricingTotals SetupCharge'),
        freight:              this.q(tts, 'PricingTotals Freight'),
        totalOrderCost:       this.q(tts, 'PricingTotals TotalOrderCost'),
        totalListPrice:       this.q(tts, 'PricingTotals TotalListPrice'),
      };

      this.order.set(parsedOrder);

      const rel = this.releaseNumber();
      this.titleSvc.setTitle(rel ? `Order Transmittal — ${rel}` : 'Order Transmittal');
    } catch (e) {
      this.parseError.set('Failed to parse XML: ' + String(e));
    }
  }

  private escHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

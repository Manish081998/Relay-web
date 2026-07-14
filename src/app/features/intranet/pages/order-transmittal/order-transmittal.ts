import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { OrderData, SdaItem } from 'src/app/models/orderData.model';
import {
  Brand,
  OrderTypeConfig,
  detectAllOrderConfigs,
  getConfigById,
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
  private readonly route = inject(ActivatedRoute);
  private readonly titleSvc = inject(Title);
  private readonly elRef = inject(ElementRef);

  readonly order = signal<OrderData | null>(null);
  readonly parseError = signal('');
  readonly releaseNumber = signal('');
  readonly printDate = signal('');
  readonly searchQuery = signal('');
  readonly currentMatchIndex = signal(-1);
  readonly markTotal = signal(0);

  ngOnInit(): void {
    this.printDate.set(new Date().toLocaleDateString('en-US'));

    const key = this.route.snapshot.queryParamMap.get('key');
    if (!key) {
      this.parseError.set('No XML content received. Please go back and click a release number.');
      return;
    }

    // sessionStorage is checked first on every load, including refreshes.
    // On the very first load the data arrives via localStorage (cross-tab delivery);
    // we migrate it to sessionStorage and immediately remove it from localStorage so
    // it never accumulates. On subsequent loads (refresh) sessionStorage already has it.
    let raw = sessionStorage.getItem(key);
    if (!raw) {
      raw = localStorage.getItem(key);
      if (raw) {
        sessionStorage.setItem(key, raw);
        localStorage.removeItem(key);
      }
    }

    if (!raw) {
      this.parseError.set('No XML content received. Please go back and click a release number.');
      return;
    }

    const data = JSON.parse(raw) as { xml?: string; releaseNumber?: string };
    this.releaseNumber.set(data.releaseNumber ?? '');
    if (data.xml) {
      this.parseXml(data.xml);
    } else {
      this.parseError.set('No XML content received. Please go back and click a release number.');
    }
  }

  /** Resolves a section's xmlType string back to its full OrderTypeConfig. */
  cfgFor(xmlType: string): OrderTypeConfig {
    return getConfigById(xmlType);
  }

  goBack(): void {
    window.close();
  }

  print(): void {
    window.print();
  }

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
    marks.forEach((m) => m.classList.remove('ot-hl-active'));
    const total = marks.length;
    this.markTotal.set(total);
    const current = this.currentMatchIndex();
    const next =
      current < 0 && direction === 1 ? 0 : (((current + direction) % total) + total) % total;
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

      const brandRoot = doc.querySelector('TTS');
      if (!brandRoot) {
        this.parseError.set('Unexpected XML structure: no <TTS> root element found.');
        return;
      }

      const brand = brandRoot.querySelector('Brand SellingWareHouse')?.textContent?.trim() as
        | Brand
        | undefined;
      const configs = detectAllOrderConfigs(brandRoot, brand);

      const sections = configs.map((cfg) => {
        const groups = Array.from(brandRoot!.querySelectorAll(cfg.groupSelector)) as Element[];

        const lineItems: Record<string, string>[] = groups.map((group) => {
          const mc = group.querySelector('ModelConfig')!;
          const item: Record<string, string> = {};
          for (const col of cfg.columns) {
            item[col.key] = this.firstOf(mc, col.xmlTags);
          }
          item['tag'] = this.q(mc, 'TagText') || this.q(mc, 'Tag');
          item['comment'] = this.q(mc, 'Comment');
          item['multiplier'] = this.q(mc, 'Multiplier');
          item['model'] = this.firstOf(mc, ['Model']);
          return item;
        });

        const lineItemOptions =
          cfg.id === 'generic'
            ? groups.map((group) => {
                const mc = group.querySelector('ModelConfig')!;
                return Array.from(mc.querySelectorAll('options > option') as NodeListOf<Element>)
                  .map((opt) => ({
                    name: opt.querySelector('option_name')?.textContent?.trim() ?? '',
                    value: opt.querySelector('option_value')?.textContent?.trim() ?? '',
                    order: parseInt(
                      opt.querySelector('option_order')?.textContent?.trim() ?? '0',
                      10,
                    ),
                  }))
                  .filter((o) => o.name !== '')
                  .sort((a, b) => a.order - b.order)
                  .map(({ name, value }) => ({ name, value }));
              })
            : undefined;

        const lineItemBlockFields =
          cfg.renderMode === 'kru-block' && cfg.blockFields
            ? groups.map((group) => {
                const mc = group.querySelector('ModelConfig')!;
                const fields: Record<string, string> = {};
                for (const bf of cfg.blockFields!) {
                  fields[bf.xmlTag] = mc.querySelector(bf.xmlTag)?.textContent?.trim() ?? '';
                }
                return fields;
              })
            : undefined;

        return { xmlType: cfg.id as string, lineItems, lineItemOptions, lineItemBlockFields };
      });

      const sdaItems: SdaItem[] = Array.from(
        brandRoot.querySelectorAll('SpecialInfo SDADetails Item'),
      ).map((item) => ({
        userName: item.querySelector('UserName')?.textContent?.trim() ?? '',
        sdaNumber: item.querySelector('SDA_Number')?.textContent?.trim() ?? '',
        category: item.querySelector('Category')?.textContent?.trim() ?? '',
        productName: item.querySelector('ProductName')?.textContent?.trim() ?? '',
        discountGroup: item.querySelector('DiscountGroup')?.textContent?.trim() ?? '',
        productQty: item.querySelector('ProductQuantity')?.textContent?.trim() ?? '',
        listPrice: item.querySelector('Product_x0020_ListPrice')?.textContent?.trim() ?? '',
        reqMultiplier: item.querySelector('ReqMultiplier')?.textContent?.trim() ?? '',
        appNet: item.querySelector('AppNet')?.textContent?.trim() ?? '',
        isReleased: item.querySelector('IsReleased')?.textContent?.trim() ?? '',
      }));

      const firstSda = brandRoot.querySelector('SpecialInfo SDADetails Item');

      const parsedOrder: OrderData = {
        repAccountNo: this.q(brandRoot, 'Brand AccountInfo RepAccountNo'),
        repPhone: this.q(brandRoot, 'Brand AccountInfo Phone'),
        repFax: this.q(brandRoot, 'Brand AccountInfo Fax'),
        program: this.q(brandRoot, 'MarketingProgram Program'),
        programCode: this.q(brandRoot, 'MarketingProgram ProgramCode'),
        totalNetWoFrt: this.q(brandRoot, 'PricingTotals NetMinusFreight'),
        soldToName: this.q(brandRoot, 'Address SoldTo Name1'),
        soldToAddress: this.q(brandRoot, 'Address SoldTo Street1'),
        soldToCity: this.q(brandRoot, 'Address SoldTo City'),
        soldToState: this.q(brandRoot, 'Address SoldTo State'),
        soldToZip: this.q(brandRoot, 'Address SoldTo Zip'),
        shipToName: this.q(brandRoot, 'Address ShipTo Name1'),
        shipToCareOf: this.q(brandRoot, 'Address ShipTo careof'),
        shipToAddress: this.q(brandRoot, 'Address ShipTo Street1'),
        shipToAddress2: this.q(brandRoot, 'Address ShipTo Street2'),
        shipToCity: this.q(brandRoot, 'Address ShipTo City'),
        shipToState: this.q(brandRoot, 'Address ShipTo State'),
        shipToZip: this.q(brandRoot, 'Address ShipTo Zip'),
        repPONo: this.q(brandRoot, 'OrderInfo RepPONo'),
        jobName: this.q(brandRoot, 'OrderInfo JobName'),
        custAccountNo: this.q(brandRoot, 'OrderInfo CustAccountNo'),
        custPO: this.q(brandRoot, 'OrderInfo CustomerPONo'),
        salesperson: this.q(brandRoot, 'OrderInfo SalesPerson'),
        jobGuid: this.q(brandRoot, 'OrderInfo JobGuid'),
        fma: this.q(brandRoot, 'SpecialInfo FMA'),
        specialItems: this.q(brandRoot, 'SpecialItems IsSpecial'),
        xLines: this.q(brandRoot, 'SpecialItems XLines'),
        commLines: this.q(brandRoot, 'SpecialItems CommLines'),
        markOrder: this.q(brandRoot, 'Shipping ShippingMethod MarkOrder'),
        callBefore: this.q(brandRoot, 'Shipping ShippingMethod CallBeforeDelivery'),
        shippingInstructions: this.q(brandRoot, 'Shipping ShippingMethod ShippingInstructions'),
        terms: this.q(brandRoot, 'Shipping ShippingMethod Terms'),
        shipVia: this.q(brandRoot, 'Shipping ShippingMethod ShipVia'),
        noPartial: this.q(brandRoot, 'Shipping ShippingMethod NoPartial'),
        releaseComments: this.q(brandRoot, 'Shipping ShippingCharges CommentsToFactory'),
        modelCount: this.q(brandRoot, 'QuantityInfo ModelCount'),
        jobNumber: this.q(brandRoot, 'QuantityInfo JobNumber'),
        jobCreated: this.q(brandRoot, 'QuantityInfo JobInitiatedDate'),
        lineCount: this.q(brandRoot, 'QuantityInfo LineCount'),
        edgeVersion: this.q(brandRoot, 'QuantityInfo VersionNumber'),
        email: this.q(brandRoot, 'QuantityInfo email'),
        ctrlQty: this.q(brandRoot, 'SpecialItems CtrlQty'),
        freightQuoteNumber: this.q(brandRoot, 'PricingTotals FreightQuoteNumber'),
        sections,
        sdaBrandName: firstSda?.querySelector('BrandName')?.textContent?.trim() ?? '',
        sdaExpireDate: firstSda?.querySelector('SDA_Expire_Date')?.textContent?.trim() ?? '',
        sdaVersion: firstSda?.querySelector('SDA_Version')?.textContent?.trim() ?? '',
        sdaPaNotes: firstSda?.querySelector('panote')?.textContent?.trim() ?? '',
        sdaItems,
        baseOrderCost: this.q(brandRoot, 'PricingTotals BaseOrderCost'),
        setupCharge: this.q(brandRoot, 'PricingTotals SetupCharge'),
        freight: this.q(brandRoot, 'PricingTotals Freight'),
        totalOrderCost: this.q(brandRoot, 'PricingTotals TotalOrderCost'),
        totalListPrice: this.q(brandRoot, 'PricingTotals TotalListPrice'),
      };

      this.order.set(parsedOrder);

      const repPO = parsedOrder.repPONo;
      this.titleSvc.setTitle(repPO ? `Order Transmittal — ${repPO}` : 'Order Transmittal');
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

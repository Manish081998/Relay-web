import { Directive, ElementRef, inject, output } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[clickOutside]',
})
export class ClickOutsideDirective {
  clickOutside = output<void>();

  private readonly el = inject(ElementRef);

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(
        filter(event => !this.el.nativeElement.contains(event.target)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.clickOutside.emit());
  }
}

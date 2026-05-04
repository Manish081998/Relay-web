import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Role } from '../../models/role.enum';
import { AuthStore } from '../../core/auth/auth.store';

@Directive({ selector: '[hasRole]' })
export class HasRoleDirective {
  hasRole = input.required<Role[]>();

  private readonly auth = inject(AuthStore);
  private readonly vcr  = inject(ViewContainerRef);
  private readonly tmpl = inject(TemplateRef);

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.auth.hasAnyRole(this.hasRole())) {
        this.vcr.createEmbeddedView(this.tmpl);
      }
    });
  }
}

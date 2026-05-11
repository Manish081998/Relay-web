import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { AuthStore } from '../../../../core/auth/auth.store';
import { BrandDto, DocumentumUserDto, UpdateDocumentumUserRequest } from '../../models/documentum-user.model';

@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  imports: [Dialog, ButtonDirective, ReactiveFormsModule, FormsModule, InputTextModule, Select, DatePipe],
  templateUrl: './edit-user-dialog.component.html',
  styleUrl: './edit-user-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserDialogComponent {
  private readonly fb        = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);

  readonly visible = model<boolean>(false);
  readonly mode    = input<'edit' | 'add'>('edit');
  readonly user    = input<DocumentumUserDto | null>(null);
  readonly saving  = input<boolean>(false);
  readonly brands  = input<BrandDto[]>([]);

  readonly saved = output<UpdateDocumentumUserRequest>();

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    emailId:   ['', [Validators.required, Validators.email]],
    globalId:  ['', Validators.required],
    password:  [''],
    isActive:  [true],
  });

  // null means "derive from user input"; a string means user explicitly picked a brand
  private readonly _brandOverride = signal<string | null>(null);

  // computed evaluates synchronously when read — no timing gap unlike effect()
  readonly selectedBrandId = computed(() => {
    const override = this._brandOverride();
    if (override !== null) return override;
    const u         = this.user();
    const brandList = this.brands();
    if (!u) return '';
    return brandList.find(
      b => b.brandGuid?.toLowerCase() === u.brandId?.toLowerCase()
    )?.brandGuid ?? u.brandId ?? '';
  });

  // toSignal makes isActive reactive in zoneless OnPush — plain .value read won't re-render
  readonly isActiveValue = toSignal(this.form.controls.isActive.valueChanges, {
    initialValue: this.form.controls.isActive.value,
  });

  constructor() {
    // Re-runs when user() changes to patch the form fields and reset the brand override
    effect(() => {
      const u = this.user();

      if (u) {
        this.form.patchValue({
          firstName: u.firstName,
          lastName:  u.lastName,
          globalId:  u.globalId ?? '',
          isActive:  u.isActive,
          emailId:   u.emailId  ?? '',
          password:  '',
        });
      } else {
        this.form.reset({ isActive: true });
      }
      // Reset override so computed re-derives brand from user() + brands()
      this._brandOverride.set(null);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });

    // Mode-driven field rules: password required in add; name/email/globalId disabled in edit
    effect(() => {
      const isEdit = this.mode() === 'edit';

      const pwCtrl = this.form.controls.password;
      if (isEdit) {
        pwCtrl.removeValidators(Validators.required);
      } else {
        pwCtrl.addValidators(Validators.required);
      }
      pwCtrl.updateValueAndValidity({ emitEvent: false });

      const readonlyInEdit = ['firstName', 'lastName', 'emailId', 'globalId'] as const;
      for (const field of readonlyInEdit) {
        if (isEdit) {
          this.form.controls[field].disable({ emitEvent: false });
        } else {
          this.form.controls[field].enable({ emitEvent: false });
        }
      }
    });
  }

  get f() { return this.form.controls; }

  get dialogTitle(): string {
    return this.mode() === 'add' ? 'Add User' : 'Edit User';
  }

  onBrandChange(guid: string | null): void {
    // Use || so an empty string from PrimeNG also falls back to null (no override)
    this._brandOverride.set(guid || null);
  }

  close(): void {
    this.visible.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v           = this.form.getRawValue();
    const currentUser = this.authStore.currentUser();
    const modifiedBy  = currentUser?.email ?? currentUser?.displayName ?? '';
    const existing    = this.user();

    // Use explicit user selection if set, otherwise fall back to the user's existing brandId.
    // Avoids depending on the brands list lookup which may be empty at submit time.
    const brandId = this._brandOverride() ?? existing?.brandId ?? '';

    const req: UpdateDocumentumUserRequest = {
      userId:    existing?.userId ?? '',
      brandId,
      isActive:  v.isActive,
      modifiedBy,
    };

    this.saved.emit(req);
  }
}

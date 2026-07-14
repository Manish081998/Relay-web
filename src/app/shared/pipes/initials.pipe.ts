import { Pipe, PipeTransform } from '@angular/core';

/** "Manish Gupta" → "MG" | "manish" → "M" */
@Pipe({ name: 'initials', standalone: true, pure: true })
export class InitialsPipe implements PipeTransform {
  transform(value: string | null | undefined, maxChars = 2): string {
    if (!value) return '?';
    return value
      .trim()
      .split(/\s+/)
      .slice(0, maxChars)
      .map(w => w[0].toUpperCase())
      .join('');
  }
}

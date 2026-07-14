/**
 * @file annot-angular.module.ts
 * NgModule that declares and exports all annotation components.
 *
 * Import this module in any Angular application that wants to use
 * the annotation library:
 *
 *   @NgModule({
 *     imports: [AnnotAngularModule],
 *   })
 *   export class AppModule {}
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnotatorComponent } from './components/annotator/annotator.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { AnnotationPanelComponent } from './components/annotation-panel/annotation-panel.component';
import * as i0 from "@angular/core";
const DECLARATIONS = [
    AnnotatorComponent,
    ToolbarComponent,
    AnnotationPanelComponent,
];
export class AnnotAngularModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, declarations: [AnnotatorComponent,
            ToolbarComponent,
            AnnotationPanelComponent], imports: [CommonModule, FormsModule], exports: [AnnotatorComponent,
            ToolbarComponent,
            AnnotationPanelComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, imports: [CommonModule, FormsModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: AnnotAngularModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: DECLARATIONS,
                    imports: [CommonModule, FormsModule],
                    exports: DECLARATIONS,
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3QtYW5ndWxhci5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2Fubm90LWFuZ3VsYXIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztHQVdHO0FBRUgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDOztBQUVwRyxNQUFNLFlBQVksR0FBRztJQUNuQixrQkFBa0I7SUFDbEIsZ0JBQWdCO0lBQ2hCLHdCQUF3QjtDQUN6QixDQUFDO0FBT0YsTUFBTSxPQUFPLGtCQUFrQjt3R0FBbEIsa0JBQWtCO3lHQUFsQixrQkFBa0IsaUJBVjdCLGtCQUFrQjtZQUNsQixnQkFBZ0I7WUFDaEIsd0JBQXdCLGFBS2QsWUFBWSxFQUFFLFdBQVcsYUFQbkMsa0JBQWtCO1lBQ2xCLGdCQUFnQjtZQUNoQix3QkFBd0I7eUdBUWIsa0JBQWtCLFlBSG5CLFlBQVksRUFBRSxXQUFXOzs0RkFHeEIsa0JBQWtCO2tCQUw5QixRQUFRO21CQUFDO29CQUNSLFlBQVksRUFBRSxZQUFZO29CQUMxQixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDO29CQUNwQyxPQUFPLEVBQUUsWUFBWTtpQkFDdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlIGFubm90LWFuZ3VsYXIubW9kdWxlLnRzXG4gKiBOZ01vZHVsZSB0aGF0IGRlY2xhcmVzIGFuZCBleHBvcnRzIGFsbCBhbm5vdGF0aW9uIGNvbXBvbmVudHMuXG4gKlxuICogSW1wb3J0IHRoaXMgbW9kdWxlIGluIGFueSBBbmd1bGFyIGFwcGxpY2F0aW9uIHRoYXQgd2FudHMgdG8gdXNlXG4gKiB0aGUgYW5ub3RhdGlvbiBsaWJyYXJ5OlxuICpcbiAqICAgQE5nTW9kdWxlKHtcbiAqICAgICBpbXBvcnRzOiBbQW5ub3RBbmd1bGFyTW9kdWxlXSxcbiAqICAgfSlcbiAqICAgZXhwb3J0IGNsYXNzIEFwcE1vZHVsZSB7fVxuICovXG5cbmltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRm9ybXNNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBBbm5vdGF0b3JDb21wb25lbnQgfSBmcm9tICcuL2NvbXBvbmVudHMvYW5ub3RhdG9yL2Fubm90YXRvci5jb21wb25lbnQnO1xuaW1wb3J0IHsgVG9vbGJhckNvbXBvbmVudCB9IGZyb20gJy4vY29tcG9uZW50cy90b29sYmFyL3Rvb2xiYXIuY29tcG9uZW50JztcbmltcG9ydCB7IEFubm90YXRpb25QYW5lbENvbXBvbmVudCB9IGZyb20gJy4vY29tcG9uZW50cy9hbm5vdGF0aW9uLXBhbmVsL2Fubm90YXRpb24tcGFuZWwuY29tcG9uZW50JztcblxuY29uc3QgREVDTEFSQVRJT05TID0gW1xuICBBbm5vdGF0b3JDb21wb25lbnQsXG4gIFRvb2xiYXJDb21wb25lbnQsXG4gIEFubm90YXRpb25QYW5lbENvbXBvbmVudCxcbl07XG5cbkBOZ01vZHVsZSh7XG4gIGRlY2xhcmF0aW9uczogREVDTEFSQVRJT05TLFxuICBpbXBvcnRzOiBbQ29tbW9uTW9kdWxlLCBGb3Jtc01vZHVsZV0sXG4gIGV4cG9ydHM6IERFQ0xBUkFUSU9OUyxcbn0pXG5leHBvcnQgY2xhc3MgQW5ub3RBbmd1bGFyTW9kdWxlIHt9XG4iXX0=
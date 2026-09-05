import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';

/** Sub-navigation shared by all five master-data admin pages. */
@Component({
  selector: 'app-master-data-tabs',
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p-tabMenu [model]="items" styleClass="mb-3"></p-tabMenu>`,
})
export class MasterDataTabsComponent {
  items: MenuItem[] = [
    { label: 'Blood groups', icon: 'pi pi-heart', routerLink: '/admin/master-data/blood-groups' },
    { label: 'Country codes', icon: 'pi pi-phone', routerLink: '/admin/master-data/country-codes' },
    { label: 'Countries', icon: 'pi pi-globe', routerLink: '/admin/master-data/countries' },
    { label: 'States', icon: 'pi pi-map', routerLink: '/admin/master-data/states' },
    { label: 'Cities', icon: 'pi pi-building', routerLink: '/admin/master-data/cities' },
  ];
}

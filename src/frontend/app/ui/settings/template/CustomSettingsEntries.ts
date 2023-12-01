import {propertyTypes} from 'typeconfig/common';
import {ClientGroupingConfig, ClientSortingConfig, SVGIconConfig} from '../../../../../common/config/public/ClientConfig';

/**
 * Configuration in these class have a custom UI
 */
export class CustomSettingsEntries {
  public static readonly entries = [
    {c: ClientSortingConfig, name: 'ClientSortingConfig'},
    {c: ClientGroupingConfig, name: 'ClientGroupingConfig'},
    {c: SVGIconConfig, name: 'SVGIconConfig'},
  ];

  public static getConfigName(s: { tags?: { uiType?: string }, type?: propertyTypes, arrayType?: propertyTypes }): string {
    let c = s.tags?.uiType;
    try {
      if (!c) {
        const ent = this.entries.find(e => {
          try {
            if (s?.arrayType) {
              return s?.arrayType == e.c;
            }
          } catch (e) {
            // do nothing
          }
          if (s?.type) {
            return s?.type == e.c;
          }
          return false;
        });
        if (ent) {
          c = ent.name;
        }
      }
    } catch (e) {
      // no action
    }
    return c;
  }

  public static getFullName(s: { tags?: { uiType?: string }, type?: propertyTypes, arrayType?: propertyTypes }): string {
    const cN = this.getConfigName(s);
    if (!s.tags?.uiType && s.arrayType) {
      return cN + '-Array';
    }
    return cN;
  }

  public static iS(s: { tags?: { uiType?: string }, type?: propertyTypes }) {
    const c = this.getConfigName(s);
    return this.entries.findIndex(e => e.name == c) !== -1;
  }
}


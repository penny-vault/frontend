/* eslint-disable import/no-duplicates */
import { boot } from 'quasar/wrappers'
import 'ag-grid-enterprise'
import { LicenseManager } from 'ag-grid-enterprise'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async (/* { app, router, ... } */) => {
  // NOTE: [v{VERSION}]_{Base 64 Expiration in Milliseconds}{MD5 Hash of previous section}
  // the md5 hash is not the same as the cmdline md5 program, use the code that's in the ag grid
  // baseline
  LicenseManager.setLicenseKey('[v1]_MjUyNzMxMTYwMDAwMA==8652bba44824dc9c0880b3637640706c')
})

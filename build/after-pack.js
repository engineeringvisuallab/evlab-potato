// electron-builder afterPack hook. Because we cannot run rcedit/wine when building on Linux, this stamps the Windows
// icon + version strings into EVLab Potato.exe with the pure-JS "resedit" package. If it fails the build still works
// (the exe just keeps the default Electron icon) and a warning is printed.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const { NtExecutable, NtExecutableResource, Resource, Data } = require('resedit');
  const exePath = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe');
  const icoPath = path.join(__dirname, 'icons', 'evlab.ico');
  try {
    const exe = NtExecutable.from(fs.readFileSync(exePath));
    const res = NtExecutableResource.from(exe);

    // icon: replace every existing icon group (Electron ships one) with ours
    const iconFile = Data.IconFile.from(fs.readFileSync(icoPath));
    const groups = Resource.IconGroupEntry.fromEntries(res.entries);
    const target = groups.length ? groups[0] : { id: 1, lang: 1033 };
    Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, iconFile.icons.map((i) => i.data));

    // version info (shown in file Properties > Details)
    const vi = Resource.VersionInfo.fromEntries(res.entries)[0];
    if (vi) {
      const v = context.packager.appInfo.version.split('.').map(Number);
      vi.setFileVersion(v[0] || 0, v[1] || 0, v[2] || 0, 0, 1033);
      vi.setProductVersion(v[0] || 0, v[1] || 0, v[2] || 0, 0, 1033);
      vi.setStringValues({ lang: 1033, codepage: 1200 }, {
        ProductName: 'EVLab Potato', FileDescription: 'EVLab Potato (EVWrite, EVCell, EVPresent)',
        CompanyName: 'Engineering Visual Lab', LegalCopyright: 'Engineering Visual Lab', OriginalFilename: path.basename(exePath), InternalName: 'EVLab Potato',
      });
      vi.outputToResourceEntries(res.entries);
    }
    res.outputResource(exe);
    fs.writeFileSync(exePath, Buffer.from(exe.generate()));
    console.log('  • afterPack: icon + version info written to', path.basename(exePath));
  } catch (e) {
    console.warn('  • afterPack WARNING: could not edit exe resources:', e.message);
  }
};

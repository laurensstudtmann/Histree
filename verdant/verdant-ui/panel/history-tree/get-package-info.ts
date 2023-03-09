//import { Kernel } from '@jupyterlab/services';
//import { SessionContext } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';

export type PackageInfo = {
  packageName: string,
  packageVersion: string,
}

export async function getUsedPackages(notebookPanel: NotebookPanel) {
  if (!notebookPanel) return;
  // Get the current kernel of the notebook
  const kernel = notebookPanel.sessionContext.session.kernel//.requestExecute()
  //const kernel = await Kernel .getKernelForSession({ id: kernelId });

  // Replace `code` with the Python code snippet from the previous answer
  const code = `
    import json
    import sys
    import pkg_resources

    installed_packages = {package.key:package.version for package in pkg_resources.working_set}

    used_packages = []
    full_sys_packages = []

    for module in sys.modules.values():
        if hasattr(module, '__file__'):
            package_name = module.__name__.split('.')[0]
            full_sys_packages.append(package_name)
            if package_name in installed_packages:
                used_packages.append((package_name, installed_packages[package_name]))
    json.dumps(installed_packages)
    # '\\n'.join(set([f'{package[0]}=={package[1]}' for package in used_packages])) + ";"\
    # + str(installed_packages) + ";"\
    # + str(set(full_sys_packages))
  `;

  // Execute the Python code in the kernel
  kernel.requestExecute({ code })
    .onIOPub  = (msg) => {
    const msgType = msg.header.msg_type;
    switch (msgType) {
      case 'execute_result':
      case 'display_data':
      case 'update_display_data':
        var result = msg.content["data"]["text/plain"];
        result = result.substring(1, result.length - 1);
        console.log(JSON.parse(result));
        /*
        const lines = result.split("\\n")
        const packageInfo = lines.map(line => {
          const [name, version] = line.split("==");
          return { packageName: name, packageVersion: version };
        })
        //var packageInfo: PackageInfo[] = 
        console.log(packageInfo);*/
        break;
      default:
        break;
    }
    return;
  };
  /*if (response.content && response.content.text) {
    const output = response.content.text.trim();
    console.log(output); // This will print the list of used packages to the console.
  }*/
}
const path = require("path");
const fs = require('fs')
const { getRealResource, getChooseList } = require('../utils/index')
const PLUGIN_NAME = "ProjectSniappet";
const JAVASCRIPT_MODULE_TYPE_AUTO = "javascript/auto";
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = "javascript/dynamic";
const JAVASCRIPT_MODULE_TYPE_ESM = "javascript/esm";

const EXPORT_DEFAULE = "export default";
const EXPORT_SINGLE_NAME = "export single name"; // eg: export const a
const EXPORT_SINGLE_LIST = 'export single name list' // eg: export const name; export const age => export default {name,age}

class ProjectSniappet {
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  constructor(options = {}) {
    this.mapList = [];
    this.options = options;
    this.context = __dirname;

    this.aliasMap = {};
    // 收集零散的 exprt const ; export function
    this.collectMap = {}
  }

  /**
   *  转换路径
   *  读取 webpack.config.js 配置中的alias，将路径转换为以alias为基准的相对路径
   *  @ 和 @src顺序转换，以免想用 @src 转换，结果用 @ 转了
   * @param {*} context
   * @param {*} alias
   */
  setAliasMap(context, alias = {}) {
    this.context = context;
    const aliasKeys = Object.keys(alias).map(it => ({ len: it.length, origin: it })).sort((a, b) => b.len - a.len).map(it => it.origin)
    for (let i = 0; i < aliasKeys.length; i++) {
      const key = aliasKeys[i]
      this.aliasMap[key] = alias[key]
    }
  }

  apply(compiler) {
    const srcContext = compiler.context;
    this.setAliasMap(srcContext, compiler.options.resolve.alias);
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        const handler = (parser) => {
          parser.hooks.export.tap(PLUGIN_NAME, (statement) => {
            this.parseExportDefault(statement, parser);
          });

          // parser.hooks.exportImport.tap(PLUGIN_NAME, (statement, source) => {
          //   // TODO 暂未发现需要处理的地方
          // });

          parser.hooks.exportDeclaration.tap(PLUGIN_NAME, (statement, declaration) => {
            this.parseExport(declaration, parser);
          });

          // parser.hooks.exportSpecifier.tap(PLUGIN_NAME, (statement, identifierName, exportName, index) => {
          //   this.index++;
          //   if (this.index > 1) return;
          //   this.parseExportSpecifier(statement, identifierName, exportName, index, parser);
          // });
        };
        normalModuleFactory.hooks.parser
          .for(JAVASCRIPT_MODULE_TYPE_AUTO)
          .tap(PLUGIN_NAME, handler);
        normalModuleFactory.hooks.parser
          .for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
          .tap(PLUGIN_NAME, handler);
        normalModuleFactory.hooks.parser
          .for(JAVASCRIPT_MODULE_TYPE_ESM)
          .tap(PLUGIN_NAME, handler);
      }
    );

    compiler.hooks.afterCompile.tap(PLUGIN_NAME, () => {
      const map = {}
      let qid = 0
      Object.keys(this.collectMap).forEach(key => {
        this.mapList.push({ ...this.collectMap[key], type: EXPORT_SINGLE_LIST })
      })
      this.mapList.forEach(item => {
        let uniqName = Array.isArray(item.name) ? item.fileName : item.name
        let originName = uniqName
        while (map[uniqName]) {
          uniqName = uniqName + qid++
        }
        map[uniqName] = {
          prefix: originName,
          body: '',
          description: JSON.stringify(item, null, 2)
        }
        switch (item.type) {
          case EXPORT_DEFAULE:
            map[uniqName].body = getChooseList([item.name, `import ${item.name} from "${item.path}";`,])
            break;
          case EXPORT_SINGLE_NAME:
            map[uniqName].body = getChooseList([item.name, `import { ${item.name} } from "${item.path}";`,])
            break;
          case EXPORT_SINGLE_LIST:
            map[uniqName].body = getChooseList([item.fileName, `import { ${item.name.join(", ")} } from "${item.path}";`,])
            break;
        }
      })
      this.generateSniappet(map)
    })
  }

  /**
   * 根据配置对象，生成全局 sniappet 文件
   * @param {*} map
   */
  generateSniappet(map) {
    const dir = '.vscode'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    fs.writeFile(path.join(dir, 'snipints.code-snippets'), JSON.stringify(map, null, 2), (err) => {
    })
  }

  /**
   * 解析export default expression
   * @param {*} declaration
   * @param {*} parser webpack parser解析器
   * @returns
   */
  parseExportSpecifier(statement, identifierName, exportName, index, parser) {
    const { resource, error, dependencies, blocks, context, _source } =
      parser.state.current;
    if (error) return;
    // console.log(Object.keys(statement), identifierName, exportName, index, resource);
    // const { declarations, id } = declaration
  }

  /**
   * 解析export
   * @param {*} declaration
   * @param {*} parser webpack parser解析器
   */
  parseExport(declaration, parser) {
    const { resource, error, dependencies, blocks, context, _source } =
      parser.state.current;
    if (error) return;
    const bodyPath = this.getPath(resource)
    const fileName = this.getFileName(resource)
    const { declarations, id } = declaration
    if (!this.collectMap[bodyPath]) {
      this.collectMap[bodyPath] = { name: [], path: bodyPath }
    }
    if (Array.isArray(declarations)) {
      declarations.forEach(declarationItem => {
        const { id } = declarationItem
        if (id && id.name) {
          const item = {
            type: EXPORT_SINGLE_NAME,
            fileName,
            name: id.name,
            path: bodyPath,
          }
          this.mapList.push(item);
          this.collectMap[bodyPath].name.push(item.name)
        }
      })
    } else if (id && id.name || declarations && declarations.id && declarations.id.name) {
      const item = {
        type: EXPORT_SINGLE_NAME,
        fileName,
        name: id.name,
        path: bodyPath,
      }
      this.mapList.push(item);
      this.collectMap[bodyPath].name.push(item.name)
    }

  }

  /**
   * 解析export default
   * @param {*} statement ast节点
   * @param {*} parser webpack parser解析器
   */
  parseExportDefault(statement, parser) {
    // TODO dependencies ,blocks 可以用来将依赖中的依赖也收集起来，方便其他地方使用
    // _source.source() 源代码
    const { resource, error, dependencies, blocks, context, _source } =
      parser.state.current;
    if (error) return;
    const { declaration = {} } = statement;
    const bodyPath = this.getPath(resource)
    const fileName = this.getFileName(resource)
    if (declaration) {
      const { name, properties, type } = declaration;
      // console.log(statement, resource);
      if (name) {
        // 这种情况好像没用，暂时不处理
        if (type === 'Identifier' && name === 'mod') return
        this.mapList.push({
          type: EXPORT_DEFAULE,
          fileName,
          name,
          path: bodyPath,
        });
      } else if (properties && properties.length) {
        // console.log(resource, properties.slice(0, 1));
        // const names = []
        // properties.forEach((property) => {
        //   const { type, key } = property;
        //   if (type === "Property") {
        //     names.push(key.name)
        //     this.mapList.push({
        //       type: EXPORT_SINGLE_NAME,
        //       fileName,
        //       name: key.name,
        //       path: bodyPath,
        //     });
        //   }
        // });
        // this.mapList.push({
        //   type: EXPORT_SINGLE_LIST,
        //   fileName,
        //   name: names,
        //   path: bodyPath,
        // });
      }
    } else {
      const resourcePath = getRealResource(resource)
      if (resourcePath === resource) return
      const fileExtname = path.extname(resourcePath).slice(1)
      const ignoreExtNameList = ['vue']
      if (ignoreExtNameList.includes(fileExtname)) {
        this.mapList.push({
          type: EXPORT_DEFAULE,
          fileName,
          name: path.basename(resourcePath, '.' + fileExtname),
          path: this.getPath(resourcePath),
        });
      }
    }
  }

  /**
   * 根据导出路径，改为根据alias配置后的路径
   * @param {*} resource
   */
  getPath(resource) {
    let findAliasPath = false;
    let execPath = "";
    for (const key in this.aliasMap) {
      const value = this.aliasMap[key];
      try {
        if (resource.startsWith(value)) {
          const realtivePath = path.relative(value, resource);
          execPath = path.join(key, realtivePath);
          findAliasPath = true;
          break;
        }
      } catch (error) {
        console.log(error);
      }
    }
    // TODO 没有设置路径别名的时候可能显示为 a/b/c.js，不能正常显示
    // 或许可以通过在 loader处理的时候，将 a/b/c.js 转换为 正常可使用的路径
    if (!findAliasPath) {
      execPath = path.relative(this.context, resource);
    }
    // TODO 暂时直接将 packages\\autocomplete\\index.js =》 packages/autocomplete/index.js
    execPath = execPath.replace(/\\/g, "/");
    return execPath;
  }

  /**
   * 获取文件名
   * @param {*} resource 资源路径
   * @returns 文件名称，不带后缀
   */
  getFileName(resource) {
    const resourcePath = getRealResource(resource)
    const fileExtname = path.extname(resourcePath)
    return path.basename(resourcePath, fileExtname)
  }
}

module.exports = ProjectSniappet;

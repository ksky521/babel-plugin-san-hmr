/**
 * @file 给san 组件添加 hmr
 * @author wangyongqing <wangyongqing01@baidu.com>
 */
const genId = require('./gen-id');
const sanHMRAPI = require.resolve('san-hot-reload-api');
const sanModuleName = 'san';
const sanComponentClassName = 'Component';
function getHmrString(resourcePath) {
    const hotId = genId(resourcePath);
    return `
    // 下面代码是 san-hmr
    if (module.hot) {
        var hotApi = require('${sanHMRAPI}');
        hotApi.install(require('san'), false);
        if (!hotApi.compatible) {
            throw new Error('san-hot-reload-api is not compatible with the version of Vue you are using.');
        }
        module.hot.accept();
        var id = '${hotId}';
        var moduleDefault = module.exports ? module.exports.default : module.__proto__.exports.default;
        if (!module.hot.data) {
            hotApi.createRecord(id, moduleDefault);
        } else {
            hotApi.reload(id, moduleDefault);
        }
    }
    `;
}

function nodeWalker(t, parse, nodePath) {
    const node = nodePath.node;
    const {filename} = nodePath.hub.file.opts; // eslint-disable-line

    let isSanComponent = false;
    function walkNodePath(check) {
        nodePath.container.find(siblingNode => {
            if (node === siblingNode) {
                return true;
            }
            if (t.isImportDeclaration(siblingNode) && siblingNode.source.value === sanModuleName) {
                for (let i = 0, len = siblingNode.specifiers.length; i < len; i++) {
                    const specifier = siblingNode.specifiers[i];
                    if (check(specifier)) {
                        isSanComponent = true;
                        // 找到了，添加 hmr 代码
                        return true;
                    }
                }
            }
        });
    }
    let sNode = node.declaration;
    let toDone = t.isClassDeclaration(sNode) && nodePath.inList;
    if (!toDone) {
        toDone = t.isClassDeclaration(node);
        if (toDone) {
            sNode = node;
        }
    }
    if (sNode && toDone) {
        const {superClass} = sNode; // eslint-disable-line
        if (t.isMemberExpression(superClass)) {
            // 这个是 extends san.Component 情况，需要判断的是 san 是否等于 import 的值
            const {object, property} = superClass;

            if (property.name === sanComponentClassName) {
                const sanLocalName = object.name;
                walkNodePath(
                    specifier => t.isImportDefaultSpecifier(specifier) && sanLocalName === specifier.local.name
                );
            }
        } else if (t.isIdentifier(superClass)) {
            // 这个是 extends Component 的情况，需要判断 Component 是否为 import 的 local.name
            const superClassName = superClass.name;

            walkNodePath(
                specifier =>
                    /* eslint-disable operator-linebreak */
                    t.isImportSpecifier(specifier) &&
                    specifier.imported.name === sanComponentClassName &&
                    superClassName === specifier.local.name
                /* eslint-enable operator-linebreak */
            );
        }

        if (isSanComponent) {
            // 添加hmr 代码
            const hmrCode = getHmrString(filename);
            nodePath.insertAfter(parse(hmrCode, {filename}).program.body[0]);
        }
    }
}
module.exports = ({types: t, parse}) => {
    const walker = nodeWalker.bind(this, t, parse);
    return {
        visitor: {
            // ClassDeclaration(nodePath) {
            //     walker(nodePath);
            // },
            ExportDefaultDeclaration(nodePath) {
                walker(nodePath);
            }
        }
    };
};

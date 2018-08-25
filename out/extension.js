'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var vscode = require("vscode");
var path = require("path");
var child_process = require("child_process");
exports.activate = function (context) {
    var rootPath = vscode.workspace.rootPath;
    var nowDeploymentsProvider = new DepNodeProvider(rootPath);
    vscode.window.registerTreeDataProvider('deployments', nowDeploymentsProvider);
    vscode.commands.registerCommand('deployments.refresh', function () { return nowDeploymentsProvider.refresh(); });
    vscode.commands.registerCommand('deployments.deploy', function () { return nowDeploymentsProvider.deploy(); });
    vscode.commands.registerCommand('deployments.remove', function (_a) {
        var url = _a.url;
        return nowDeploymentsProvider.delete(url);
    });
    vscode.commands.registerCommand('deployments.open', function (_a) {
        var url = _a.url;
        return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https:" + url));
    });
};
var DepNodeProvider = (function () {
    function DepNodeProvider(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    DepNodeProvider.prototype.refresh = function () {
        this._onDidChangeTreeData.fire();
    };
    DepNodeProvider.prototype.deploy = function () {
        var _this = this;
        vscode.window.showInformationMessage("Deploying " + this.workspaceRoot + "...");
        child_process.exec("now " + this.workspaceRoot + " --public", function (error, stdout, stderr) {
            if (error) {
                vscode.window.showErrorMessage("Deployement failed " + error.message.split('\n').slice(1).join('\n'));
                return;
            }
            vscode.window.showInformationMessage('Deployement done!');
            _this.refresh();
        });
    };
    DepNodeProvider.prototype.delete = function (url) {
        var _this = this;
        vscode.window.showInformationMessage("Deleting " + url + "...");
        child_process.exec("now rm " + url + " -y", function (error, stdout, stderr) {
            if (error) {
                vscode.window.showErrorMessage("Deletion failed " + error.message.split('\n').slice(1).join('\n'));
                return;
            }
            vscode.window.showInformationMessage('Deletion done!');
            _this.refresh();
        });
    };
    DepNodeProvider.prototype.getTreeItem = function (element) {
        return element;
    };
    DepNodeProvider.prototype.getChildren = function () {
        var _this = this;
        return new Promise(function (resolve) {
            child_process.exec('now ls', function (error, stdout, stderr) {
                if (error) {
                    return resolve([]);
                }
                var apps = stdout.split('\n').slice(1)
                    .filter(function (v) { return v.trim() ? true : false; })
                    .map(function (v) { return v.split(' ').map(function (c) { return c.trim(); }).filter(function (c) { return c.trim() ? true : false; }); })
                    .map(function (dep) { return dep[0]; });
                Promise.all(apps.map(function (app) { return _this.getDeployments(app); }))
                    .then(function (deployments) {
                    resolve([].concat.apply([], deployments));
                });
            });
        });
    };
    DepNodeProvider.prototype.getDeployments = function (app) {
        return new Promise(function (resolve) {
            child_process.exec("now ls -a " + app, function (error, stdout, stderr) {
                if (error) {
                    return resolve([]);
                }
                var deployments = stdout.split('\n').slice(1)
                    .filter(function (v) { return v.trim() ? true : false; })
                    .map(function (v) { return v.split(' ').map(function (c) { return c.trim(); }).filter(function (c) { return c.trim() ? true : false; }); })
                    .map(function (dep) { return new Deployment(dep[0], dep[1], dep[3], dep[4], dep[5]); });
                resolve(deployments);
            });
        });
    };
    return DepNodeProvider;
}());
exports.DepNodeProvider = DepNodeProvider;
var Deployment = (function (_super) {
    __extends(Deployment, _super);
    function Deployment(app, url, type, state, age) {
        var _this = _super.call(this, app + " (https://" + url + ")") || this;
        _this.app = app;
        _this.url = url;
        _this.type = type;
        _this.state = state;
        _this.age = age;
        _this.acceptedTypes = [
            'NPM',
            'STATIC'
        ];
        _this.iconPath = {
            light: path.join(__filename, '..', '..', 'media', 'icons', (_this.acceptedTypes.indexOf(_this.type) > -1 ? _this.type : 'DOCKER') + ".svg"),
            dark: path.join(__filename, '..', '..', 'media', 'icons', (_this.acceptedTypes.indexOf(_this.type) > -1 ? _this.type : 'DOCKER') + ".svg")
        };
        _this.contextValue = 'deployment';
        return _this;
    }
    Object.defineProperty(Deployment.prototype, "tooltip", {
        get: function () {
            return this.state;
        },
        enumerable: true,
        configurable: true
    });
    return Deployment;
}(vscode.TreeItem));
//# sourceMappingURL=extension.js.map
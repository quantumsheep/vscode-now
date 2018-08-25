'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';

export const activate = (context: vscode.ExtensionContext) => {
    const rootPath = vscode.workspace.rootPath;

    const nowDeploymentsProvider = new DepNodeProvider(rootPath);

    vscode.window.registerTreeDataProvider('deployments', nowDeploymentsProvider);
    vscode.commands.registerCommand('deployments.refresh', () => nowDeploymentsProvider.refresh());
    vscode.commands.registerCommand('deployments.deploy', () => nowDeploymentsProvider.deploy());
    vscode.commands.registerCommand('deployments.remove', ({ url }: Deployment) => nowDeploymentsProvider.delete(url));
    vscode.commands.registerCommand('deployments.open', ({ url }: Deployment) => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https:${url}`)));
};

export class DepNodeProvider implements vscode.TreeDataProvider<Deployment> {
    private _onDidChangeTreeData: vscode.EventEmitter<Deployment | undefined> = new vscode.EventEmitter<Deployment | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Deployment | undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    deploy(): void {
        vscode.window.showInformationMessage(`Deploying ${this.workspaceRoot}...`);

        child_process.exec(`now ${this.workspaceRoot} --public`, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Deployement failed ${error.message.split('\n').slice(1).join('\n')}`);
                return;
            }

            vscode.window.showInformationMessage('Deployement done!');
            this.refresh();
        });
    }

    delete(url: string): void {
        vscode.window.showInformationMessage(`Deleting ${url}...`);
        
        child_process.exec(`now rm ${url} -y`, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Deletion failed ${error.message.split('\n').slice(1).join('\n')}`);
                return;
            }

            vscode.window.showInformationMessage('Deletion done!');
            this.refresh();
        });
    }

    getTreeItem(element: Deployment): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<Deployment[]> {
        return new Promise(resolve => {
            child_process.exec('now ls', (error, stdout, stderr) => {
                if (error) {
                    return resolve([]);
                }

                const apps = stdout.split('\n').slice(1)
                    .filter(v => v.trim() ? true : false)
                    .map(v => v.split(' ').map(c => c.trim()).filter(c => c.trim() ? true : false))
                    .map(dep => dep[0]);

                Promise.all(apps.map(app => this.getDeployments(app)))
                    .then(deployments => {
                        resolve([].concat(...deployments));
                    });
            });
        });
    }

    getDeployments(app: string): Promise<Deployment[]> {
        return new Promise(resolve => {
            child_process.exec(`now ls -a ${app}`, (error, stdout, stderr) => {
                if (error) {
                    return resolve([]);
                }

                const deployments = stdout.split('\n').slice(1)
                    .filter(v => v.trim() ? true : false)
                    .map(v => v.split(' ').map(c => c.trim()).filter(c => c.trim() ? true : false))
                    .map(dep => new Deployment(dep[0], dep[1], dep[3], dep[4], dep[5]));

                resolve(deployments);
            });
        });
    }
}

class Deployment extends vscode.TreeItem {
    acceptedTypes = [
        'NPM',
        'STATIC'
    ];

    constructor(public readonly app: string, private readonly url: string, private type: string, private readonly state: string, private readonly age: string) {
        super(`${app} (https://${url})`);
    }

    get tooltip(): string {
        return this.state;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'media', 'icons', `${this.acceptedTypes.indexOf(this.type) > -1 ? this.type : 'DOCKER'}.svg`),
        dark: path.join(__filename, '..', '..', 'media', 'icons', `${this.acceptedTypes.indexOf(this.type) > -1 ? this.type : 'DOCKER'}.svg`)
    };

    contextValue = 'deployment';
}
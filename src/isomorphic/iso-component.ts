
import React, {ReactNode} from 'react';

import Types from '../types';
import { IConfiguration } from "../types/configuration";
import { IInfrastructure } from "../types";

import { isMiddleware } from '../middleware/middleware-component';
import { isWebApp } from '../webapp/webapp-component';
import { getChildrenArray, findComponentRecursively } from '../libs';

import { IsoPlugin } from './iso-plugin';
import { WebAppPlugin } from '../webapp/webapp-plugin';
import { EnvironmentPlugin } from '../environment/environment-plugin';
import { DataLayerPlugin } from '../datalayer/datalayer-plugin';
import { IdentityPlugin } from '../identity/identity-plugin';
import { AuthenticationPlugin } from '../authentication/authentication-plugin';
import {isDataLayer} from "../datalayer/datalayer-component";
import {ServicePlugin} from "../service/service-plugin";
import {isService} from "../service/service-component";
import {isStorage} from "../storage/storage-component";
import {StoragePlugin} from "../storage/storage-plugin";

export const ISOMORPHIC_INSTANCE_TYPE = "IsomorphicComponent";

/**
 * Specifies all the properties that an Isomorphic-Component must get from the user, as args
 */
export interface IIsomorphicArgs {

    /**
     * name of the Cloudformation Stack
     */
    stackName: string,

    /**
     * Local, relative directory specifies where to put the final bundles
     */
    buildPath: string,

    /**
     * Relative directory specifies where to put the assets (e.g. client-app-bunde-js)
     */
    assetsPath: string,

    /**
     * The AWS region
     */
    region: string,
}

/**
 * specifies the properties that an Isomorphic-Component has during runtime
 */
export interface IIsomorphicProps {

    /**
     * An isomorphic component supports middlewares, defines as direct children
     */
    middlewares: Array<any>,

    /**
     * WebApps reply to the request
     */
    webApps: Array<any>,

    /**
     * Services of the app
     */
    services: Array<any>,

    /**
     * Filled when the Isomorphic App has a DataLayer
     */
    dataLayerId?: string,

    /**
     * Additional iam-permissions
     * e.g. [
     * {
     *   Effect: "Allow",
     *   Action: ["dynamodb:Query"],
     *   Resource:  "arn:aws:dynamodb:us-west-2:111110002222:table/my-new-table"
     * }
     * ]
     */
    iamRoleStatements?: Array<any>
}

/**
 * The IsomorphicApp is an infrastructure and must implement [[IInfrastructure]]
 *
 * @param props
 */
export default (props: IIsomorphicArgs | any) => {

    //console.log ("isomorphic: ",props );

    const infProps: IInfrastructure & IConfiguration = {

        // allows to identify this component as Infrastructure
        infrastructureType: Types.INFRASTRUCTURE_TYPE_CONFIGURATION,

        instanceId: props.stackName,
        
        instanceType: ISOMORPHIC_INSTANCE_TYPE,

        // only load plugins during compilation
        createPlugins: (configPath: string, stage: string | undefined, parserMode: string) => props.infrastructureMode === "COMPILATION" ? [
            // be able to process IsomorphicApps (as top-level-node)
            IsoPlugin({
                parserMode: parserMode,
                buildPath: props.buildPath,
                configFilePath: configPath
            }),


            DataLayerPlugin({
                parserMode: parserMode,
                buildPath: props.buildPath,
                configFilePath: configPath,
            }),

            // isomorphic apps can have webapps (i.e. clients!)
            WebAppPlugin({
                parserMode: parserMode,
                buildPath: props.buildPath,
                configFilePath: configPath,
                assetsPath: props.assetsPath
            }),
            
            ServicePlugin({}),

            StoragePlugin({
                buildPath: props.buildPath,
                parserMode: parserMode
            }),

            // isomorphic apps can have different environments
            EnvironmentPlugin({
                stage: stage,
                parserMode: parserMode
            }),

            IdentityPlugin({}),

            AuthenticationPlugin({}),

        ] : []
    };

    const isoProps: IIsomorphicProps = {
        middlewares: findComponentRecursively(props.children, isMiddleware),

        webApps: findComponentRecursively(props.children, isWebApp),

        services: findComponentRecursively(props.children,  c => isService(c) || isStorage(c)),

        dataLayerId: findComponentRecursively(props.children, isDataLayer).reduce((res, dl) => res ? res : dl.id, undefined)
    }

    //console.log("webapps: ", isoProps.webApps)
    

    return Object.assign(props, infProps, isoProps);


};

export function isIsomorphicApp(component) {
    return component !== undefined &&
        component.instanceType === ISOMORPHIC_INSTANCE_TYPE
}
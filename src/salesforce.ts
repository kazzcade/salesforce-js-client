export type SoapType =
    'tns:ID'
    | 'xsd:boolean'
    | 'xsd:string'
    | 'xsd:double'
    | 'urn:address'
    | 'xsd:int'
    | 'xsd:dateTime'
    | 'xsd:date'
    | 'urn:location';

export type SObject = {
    Id: string;
};

export type SObjectMetaSummary = {
    queryable: boolean;
    triggerable: boolean;
    custom: boolean;
    name: string;
    fields: SObjectFieldMetaSummary[];
};

export type SObjectFieldMetaSummary = {
    name: string;
    type: string;
    length: number;
};

export type SObjectMeta = {
    encoding: string;
    maxBatchSize: number;
    sobjects: {
        activateable: boolean;
        createable: boolean;
        custom: boolean;
        customSetting: boolean;
        deletable: boolean;
        deprecatedAndHidden: boolean;
        feedEnabled: boolean;
        hasSubtypes: boolean;
        isSubtype: boolean;
        keyPrefix: any;
        label: string;
        labelPlural: string;
        layoutable: boolean;
        mergeable: boolean;
        mruEnabled: boolean;
        name: string;
        queryable: boolean;
        replicateable: boolean;
        retrieveable: boolean;
        searchable: boolean;
        triggerable: boolean;
        undeletable: boolean;
        updateable: boolean;
        urls: {
            rowTemplate: string;
            defaultValues: string;
            describe: string;
            sobject: string;
        };
    }[];
};

export type SObjectDescription = {
    actionOverrides: {
        formFactor: string;
        isAvailableInTouch: boolean;
        name: string;
        pageId: string;
        url: any;
    }[];
    activateable: boolean;
    childRelationships: {
        cascadeDelete: boolean;
        childSObject: string;
        deprecatedAndHidden: boolean;
        field: string;
        junctionIdListNames: any[];
        junctionReferenceTo: any[];
        relationshipName: string;
        restrictedDelete: boolean;
    }[];
    compactLayoutable: boolean;
    createable: boolean;
    custom: boolean;
    customSetting: boolean;
    deletable: boolean;
    deprecatedAndHidden: boolean;
    feedEnabled: boolean;
    fields: {
        aggregatable: boolean;
        aiPredictionField: boolean;
        autoNumber: boolean;
        byteLength: number;
        calculated: boolean;
        calculatedFormula: any;
        cascadeDelete: boolean;
        caseSensitive: boolean;
        compoundFieldName: any;
        controllerName: any;
        createable: boolean;
        custom: boolean;
        defaultValue: any;
        defaultValueFormula: any;
        defaultedOnCreate: boolean;
        dependentPicklist: boolean;
        deprecatedAndHidden: boolean;
        digits: number;
        displayLocationInDecimal: boolean;
        encrypted: boolean;
        externalId: boolean;
        extraTypeInfo: any;
        filterable: boolean;
        filteredLookupInfo: any;
        formulaTreatNullNumberAsZero: boolean;
        groupable: boolean;
        highScaleNumber: boolean;
        htmlFormatted: boolean;
        idLookup: boolean;
        inlineHelpText: any;
        label: string;
        length: number;
        mask: any;
        maskType: any;
        name: string;
        nameField: boolean;
        namePointing: boolean;
        nillable: boolean;
        permissionable: boolean;
        picklistValues: any[];
        polymorphicForeignKey: boolean;
        precision: number;
        queryByDistance: boolean;
        referenceTargetField: any;
        referenceTo: any[];
        relationshipName: any;
        relationshipOrder: any;
        restrictedDelete: boolean;
        restrictedPicklist: boolean;
        scale: number;
        searchPrefilterable: boolean;
        soapType: SoapType;
        sortable: boolean;
        type: string;
        unique: boolean;
        updateable: boolean;
        writeRequiresMasterRead: boolean;
    }[];
    hasSubtypes: boolean;
    isSubtype: boolean;
    keyPrefix: string;
    label: string;
    labelPlural: string;
    layoutable: boolean;
    listviewable: any;
    lookupLayoutable: any;
    mergeable: boolean;
    mruEnabled: boolean;
    name: string;
    namedLayoutInfos: any[];
    networkScopeFieldName: any;
    queryable: boolean;
    recordTypeInfos: {
        active: boolean;
        available: boolean;
        defaultRecordTypeMapping: boolean;
        developerName: string;
        master: boolean;
        name: string;
        recordTypeId: string;
        urls: {
            layout: string;
        };
    }[];
    replicateable: boolean;
    retrieveable: boolean;
    searchLayoutable: boolean;
    searchable: boolean;
    supportedScopes: {
        label: string;
        name: string;
    }[];
    triggerable: boolean;
    undeletable: boolean;
    updateable: boolean;
    urls: {
        compactLayouts: string;
        rowTemplate: string;
        approvalLayouts: string;
        uiDetailTemplate: string;
        uiEditTemplate: string;
        defaultValues: string;
        listviews: string;
        describe: string;
        uiNewRecord: string;
        quickActions: string;
        layouts: string;
        sobject: string;
    };
};

export type SObjectField = {
    aggregatable: boolean;
    aiPredictionField: boolean;
    autoNumber: boolean;
    byteLength: number;
    calculated: boolean;
    calculatedFormula: any;
    cascadeDelete: boolean;
    caseSensitive: boolean;
    compoundFieldName: string;
    controllerName: any;
    createable: boolean;
    custom: boolean;
    defaultValue: any;
    defaultValueFormula: any;
    defaultedOnCreate: boolean;
    dependentPicklist: boolean;
    deprecatedAndHidden: boolean;
    digits: number;
    displayLocationInDecimal: boolean;
    encrypted: boolean;
    externalId: boolean;
    extraTypeInfo: string;
    filterable: boolean;
    filteredLookupInfo: any;
    formulaTreatNullNumberAsZero: boolean;
    groupable: boolean;
    highScaleNumber: boolean;
    htmlFormatted: boolean;
    idLookup: boolean;
    inlineHelpText: any;
    label: string;
    length: number;
    mask: any;
    maskType: any;
    name: string;
    nameField: boolean;
    namePointing: boolean;
    nillable: boolean;
    permissionable: boolean;
    picklistValues: {
        active: boolean;
        defaultValue: boolean;
        label: string;
        validFor: any;
        value: string;
    }[];
    polymorphicForeignKey: boolean;
    precision: number;
    queryByDistance: boolean;
    referenceTargetField: any;
    referenceTo: any[];
    relationshipName: any;
    relationshipOrder: any;
    restrictedDelete: boolean;
    restrictedPicklist: boolean;
    scale: number;
    searchPrefilterable: boolean;
    soapType: SoapType;
    sortable: boolean;
    type: string;
    unique: boolean;
    updateable: boolean;
    writeRequiresMasterRead: boolean;
};

export type SObjectFieldPicklistValue = {
    active: boolean;
    defaultValue: boolean;
    label: string;
    validFor: any;
    value: string;
};

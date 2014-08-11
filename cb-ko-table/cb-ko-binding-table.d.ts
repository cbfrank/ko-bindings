declare module $CB.Ko.Binding.Table {
    interface ICRUDActionTypes {
        add: string;
        'delete': string;
        change: string;
        save: string;
    }

    interface ModelStatusConsts {
        New: string;
        Changed: string;
        Deleted: string;
        Normal: string;
    }

    interface ITableCRUDBindingHandler extends KnockoutBindingHandler {
        crudActionTypes: ICRUDActionTypes;
        modelStatus(model: any, status?: string, force?: boolean): string;
        modelStatusConsts: ModelStatusConsts;
    }

    interface IOrderFieldInfo {
        field: string;
        asc: boolean; //true means asc, false means desc
    }

    export class TableCreater {
        templatesTagName: string;
        cellTemplateAttrName: string;
        cellTemplateTagName: string;
        editorTemplateAttrName: string;
        editorTemplateTagName: string;
        dataItemPropertyAttrName: string;
        tdClassAttrName: string;
        notEditAttrName: string;
        notAddAttrName: string;
        notOrderAttName: string;
        editorFinishEventAttrName: string;
        editorFinishAttrName: string;
        orderFieldAttrName: string;
        selectedRowClass: string;
        focusRowClass: string;
        selectedCellClass: string;
        focusCellClass: string;
        inlineEditingCellClass: string;
        orderedAscHeaderClass: string;
        orderedDescHeaderClass: string;
        orderableColumnClass: string;
        buttonDefaultNames: {
            addBtnName: string;
            delBtnName: string;
            changeBtnName: string;
            saveBtnName: string;
        };

        crudButtonsContainerClass: string;
        defaultModalEditorContainerBodyClass: string;
    }
}

declare var tableCreater: $CB.Ko.Binding.Table.TableCreater;

interface KnockoutBindingHandlers {
    tableCRUD: $CB.Ko.Binding.Table.ITableCRUDBindingHandler;
}
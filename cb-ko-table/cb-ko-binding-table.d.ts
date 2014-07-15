declare module $CB.ko.binding.table {
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
}

interface KnockoutBindingHandlers {
    tableCRUD: $CB.ko.binding.table.ITableCRUDBindingHandler;
}
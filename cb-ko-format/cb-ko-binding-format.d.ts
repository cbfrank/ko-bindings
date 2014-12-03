declare module $CB.Ko.Binding.Format {
    export interface IFormatBindingHandler extends KnockoutBindingHandler {
        dataTypes: {
            number: string;
            dateTime: string;
            func: string;
        }
    }
}
interface KnockoutBindingHandlers {
    format: $CB.Ko.Binding.Format.IFormatBindingHandler;
}
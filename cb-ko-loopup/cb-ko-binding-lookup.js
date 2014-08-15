/*
data-bind = "table: {
    source: ***, //a collection that contains all the data items to be lookup
    lookupProp: string, the property name of the item in the source
    lookupValue: the value that should be matched to the value of the property(lookupProp) of the item in source, if it is array, then all the items' corresponding display text in the array will be shown
    lookupValueItemProp: the prop of the items in loopupValue array, that will be used to match the value in source
    displayProp: the property of the item in source that should be displayed as the text of the element, it also can be a valid expression, the "this" is current item, and we can also use $parent, $parents, $data and $root
    seperator: default is ",", if lookupValue is array, then each displaied item will be seperated by the seperator
}"
*/
(function () {
    var _ = {
        UO: ko.utils.unwrapObservable
    };

    _.LU = ko.bindingHandlers.lookup = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = valueAccessor();
            var source = _.UO(value.source);
            var lookupProp = _.UO(value.lookupProp);
            var lookupValue = _.UO(value.lookupValue);
            var displayProp = _.UO(value.displayProp);
            var seperator = _.UO(value.seperator);
            var lookupValueItemProp = _.UO(value.lookupValueItemProp);

            if (!seperator) {
                seperator = ", ";
            }
            var lookupValues = [];
            if ($.isArray(lookupValue)) {
                lookupValues = lookupValue;
            } else {
                lookupValues.push(lookupValue);
            }

            var result = "";
            for (var j = 0; j < lookupValues.length; j++) {
                for (var i = 0; source && (i < source.length) ; i++) {
                    var v = lookupValues[j];
                    if (typeof (lookupValueItemProp) !== "undefined") {
                        v = v[lookupValueItemProp];
                    }
                    if (_.UO(source[i][lookupProp]) == v) {
                        if (j > 0) {
                            result += seperator;
                        }
                        var item = _.UO(source[i]);
                        if (displayProp) {
                            if ((displayProp in item)) {
                                result += _.UO(item[displayProp]);
                            } else {
                                result += (function () {
                                    var func;
                                    if (element[0][displayProp]) {
                                        func = element[0][displayProp];
                                    } else {
                                        var funcBody = "with ($bindingContext){with($bindingContextOverride) {with ($currentItem) {return " + displayProp + ";}}}"
                                        element[0][displayProp] = func = new Function("$bindingContext", "$currentItem", "$bindingContextOverride", funcBody);
                                    }
                                    var bindingContextOverride = {
                                        $parents: bindingContext.$parents.slice(0),
                                        $data: item,
                                        $parent: viewModel
                                    };
                                    bindingContextOverride.$parents.splice(0, 0, viewModel);
                                    return func(bindingContext, item, bindingContextOverride);
                                })();
                            }
                        } else { //if displayProp is empty, it means directly show the current item
                            result += item;
                        }

                        break;
                    }
                }
            }
            _.LU.setElement(element, result);
        },

        setElement: function (element, displayValue) {
            if ($(element).prop("tagName") === "INPUT") {
                $(element).val(displayValue);
            } else {
                $(element).text(displayValue);
            }
        }
    };
})();
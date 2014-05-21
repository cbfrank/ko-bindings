/*
binding format
data-bind = "table: {
    chosenOption: *** or {***} //the option passed to chosen function when create the chosen
    source: ***, //source items
    valueProp: *** //the property (string, or expression string) of the items in source or a function that will be used as the value of the option, if undefined, then the item it self will be used as the value of the option
                   //then the value will be add into selectedValue (array) or set to selectedValue when the option is selected
    valuePropertyForMatch: *** //the property (string, or expression string) of the items in source or a function that will be used to compare with the selectedValue.selectedValueItemProp or selectedValue[i].selectedValueItemProp
                            //to determin if an option should be shown as selected or not
    selectedValue: *** //the value that user is selected, it can be array
    selectedValueItemProp: the prop of the items in selectedValue array, that will be used to match the value in source
    displayProp: the property of the items in source that will be used as the text of the option, it also can be a valid expression, the "this" is current item, and we can also use $parent, $parents, $data and $root
    isOptionGroup: the property name (string) or an string of expression or a function(item) that return boolean to determin if a item in the source is a normal option or the group of the options, 
        default is undefine, means not group, if is string, then if the item in the source has the property specified by string, then will use it, if not, then will take the string as an expression,
        if is a function, then will just call it, the property/expression/function should be of boolean
    groupName: the property name (string) or expression (string) or function(item) that will be shown as the group name
    groupItems: the property name (string) or expression (string) or function(item) that return an array or observableArray of all the itmes in the group
}"
*/
(function () {
    var _ = {
        UO: ko.utils.unwrapObservable
    };

    _.CO = ko.bindingHandlers.chosen = {
        elementMarkClass: "ko-bindingHandlers-chosen-element",

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            if ($(element).prop("tagName") !== "SELECT") {
                throw "chosen binding can be applied only for select";
            }
            $(element).addClass("chosen-select");
            $(element).addClass(_.CO.elementMarkClass);
            var value = valueAccessor();
            _.CO.updateSelect(element, value, bindingContext, viewModel);

            var chosen;
            //this is a bug of chosen, that is if the html havn't been show, then the chosen control (div) will be set as 0px width
            //to fix this, we have manually get the original select width and use it as the option to set chosen
            var chosenOpt = { width: $(element).outerWidth() + "px" };
            if (value.chosenOption) {
                chosenOpt = $.extend(chosenOpt, _.UO(value.chosenOption));
            }
            chosen = $(element).chosen(chosenOpt);

            //hack: if the any parent of chosen css is set to "overflow: hidden", 
            //and the parent height is less to show the full chosen input and drop down, then the drowdown can't be show
            //here we add a div in side the form, as the root container, then it is ok
            if ($(element).parent()) {
                //on a modal
            }

            chosen.change(function (event, data) {
                _.CO.updateValue(value, $(element).val(), element, allBindingsAccessor, bindingContext, viewModel);
                //if (ko.isObservable(value.selectedValue)) {
                //    value.selectedValue(data.selected);
                //} else {
                //    throw 'selectedValue must be bound to an observable field';
                //    //we throw this exception is becasue ,value is the binding value, will will copy from the specified property of viewModel
                //    //and if it is not a observable, then just value copy, which will not change the copied property of viewModel
                //    //value.selectedValue = data.selected;
                //}
            });
        },

        //set the bound view model property value to the selected value
        updateValue: function (databoundValue, selectedOptionValue, element, allBindingsAccessor, bindingContext, viewModel) {
            var selectedOptionValueArray = [];
            if ($.isArray(selectedOptionValue)) {
                selectedOptionValueArray = selectedOptionValue;
            } else {
                selectedOptionValueArray.push(selectedOptionValue);
            }

            var tmpSetValueArray = [];
            for (var i = 0; i < selectedOptionValueArray.length; i++) {
                if (typeof (selectedOptionValueArray[i]) === "undefined" || selectedOptionValueArray[i] == null) {
                    continue;
                }
                var optionValue = $(element).find("[value=" + selectedOptionValueArray[i] + "]").data("item");
                optionValue = _.CO.tryGetValueOf(element, bindingContext, viewModel, optionValue, databoundValue.valueProp, true);
                tmpSetValueArray.push(optionValue);
            }

            if (ko.isObservable(databoundValue.selectedValue)) {
                //if multi select, then the target must be an observable array, so just update it with the array
                if ($(element).prop("multiple")) {
                    databoundValue.selectedValue(tmpSetValueArray);
                } else {
                    databoundValue.selectedValue(tmpSetValueArray[0]);
                }
                ////if multi select, then the target must be an observable array, so just update it with the array
                //if (tmpSetValueArray.length > 1) {
                //    databoundValue.selectedValue(tmpSetValueArray);
                //} else {
                //    //check if target is an array
                //    if (databoundValue.selectedValue.push) {
                //        databoundValue.selectedValue(tmpSetValueArray);
                //    } else {
                //        databoundValue.selectedValue(tmpSetValueArray[0]);
                //    }
                //}
            } else {
                throw 'selectedValue must be bound to an observable field';
                //we throw this exception is becasue ,value is the binding value, will will copy from the specified property of viewModel
                //and if it is not a observable, then just value copy, which will not change the copied property of viewModel
                //databoundValue.selectedValue = selectedOptionValue;
            }
        },

        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            _.CO.updateSelect(element, valueAccessor(), bindingContext, viewModel);

            //for the case, if the selected value is not any option, but the chose is set to single select mode, then it will select the frist value, but won't trigger change event
            //so we force the value are always same between the element and the viewmodel
            _.CO.updateValue(valueAccessor(), $(element).val(), element, allBindingsAccessor, bindingContext, viewModel);

            $(element).trigger("chosen:updated");
        },

        //1. if propOrExpOrFunc is string, then try get value as it is the property name
        //2. try take propOrExpOrFunc as a expression and build it and resolve
        //3. if propOrExpOrFunc is not a string, take it as function and call
        tryGetValueOf: function (element, bindingContext, viewModel, target, propOrExpOrFunc, returnTargetIfUndefine) {
            element = $(element);
            function evaluateExpression(expStr, theItem) {
                theItem = _.UO(theItem);
                var func;
                //we cache the expression function so that we can reuse it next time
                //so we first check if the expression is cached
                if (element[0][expStr]) {
                    func = element[0][expStr];
                } else {
                    var funcBody = "with ($bindingContext){with($bindingContextOverride) {with ($currentItem) {return " + expStr + ";}}}"
                    element[0][expStr] = func = new Function("$bindingContext", "$currentItem", "$bindingContextOverride", funcBody);
                }
                var bindingContextOverride = {
                    $parents: bindingContext.$parents.slice(0),
                    $data: theItem,
                    $parent: viewModel
                };
                bindingContextOverride.$parents.splice(0, 0, viewModel);
                return func(bindingContext, theItem, bindingContextOverride);
            }

            target = _.UO(target);
            propOrExpOrFunc = _.UO(propOrExpOrFunc);
            if (typeof (propOrExpOrFunc) === "undefined") {
                if (returnTargetIfUndefine) {
                    return target;
                }
                return undefined;
            }
            if (typeof (propOrExpOrFunc) === "string") {
                if (typeof (target[propOrExpOrFunc]) === "undefined") {
                    return evaluateExpression(propOrExpOrFunc, target);
                } else {
                    return _.UO(target[propOrExpOrFunc]);
                }
            } else {
                return propOrExpOrFunc.call(viewModel, target);
            }
        },

        updateSelect: function (element, bindData, bindingContext, viewModel) {
            element = $(element);
            element.empty();
            var value = _.UO(bindData);
            var source = _.UO(value.source);
            if (typeof (source) === "undefined" || source == null) {
                source = [];
            }
            var selectedValue = _.UO(value.selectedValue);
            var displayProp = _.UO(value.displayProp);
            var selectedValueItemProp = _.UO(value.selectedValueItemProp);

            var selectedValueArray = [];
            if ($.isArray(selectedValue)) {
                selectedValueArray = selectedValue;
            } else {
                selectedValueArray.push(selectedValue);
            }
            var valuePropertyForMatch = value.valuePropertyForMatch;
            if (typeof (valuePropertyForMatch) == "undefined" && typeof (selectedValueItemProp) == "undefined") {
                valuePropertyForMatch = value.valueProp;
            }

            function inArray(array, arrayItemProp, searchValue) {
                for (var j = 0; j < array.length; j++) {
                    if (_.CO.tryGetValueOf(element, bindingContext, viewModel, array[j], arrayItemProp, true) == searchValue) {
                        return true;
                    }
                }
                return false;
            }

            var optionNo = 0;

            function createOptions(parentElement, items) {
                parentElement = $(parentElement);
                items = _.UO(items);
                if (typeof (items) === "undefined") {
                    return;
                }
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var isGroup = false;
                    var opt;
                    if (value.isOptionGroup) {
                        isGroup = _.CO.tryGetValueOf(element, bindingContext, viewModel, item, value.isOptionGroup, false);
                    }
                    if (isGroup) {
                        opt = $('<optgroup label="' + _.CO.tryGetValueOf(element, bindingContext, viewModel, item, value.groupName, true) + '" />');
                        parentElement.append(opt);
                        createOptions(opt, _.CO.tryGetValueOf(element, bindingContext, viewModel, item, value.groupItems, true));
                    } else {
                        var displayValue = _.CO.tryGetValueOf(element, bindingContext, viewModel, item, displayProp, true);
                        if (inArray(selectedValueArray, selectedValueItemProp, _.CO.tryGetValueOf(element, bindingContext, viewModel, item, valuePropertyForMatch, true))) {
                            opt = $('<option selected="selected" value="' + optionNo + '">' + displayValue + '</option>');
                        } else {
                            opt = $('<option value="' + optionNo + '">' + displayValue + '</option>');
                        }
                        opt.data("item", _.UO(item));
                        parentElement.append(opt);
                        optionNo++;
                    }
                }
            }

            createOptions(element, source);
        }
    };

    $(document).ready(function () {
        if (typeof (tableInlineEditFinishHandler) !== "undefined") {
            tableInlineEditFinishHandler.registerHandler("." + _.CO.elementMarkClass, function ($currentCell, $editor, $endEdit) {
                var chosenDiv = $editor.next().filter(".chosen-container");
                if (chosenDiv.length < 0) {
                    throw "Can't find chosen container!"
                }
                chosenDiv = $(chosenDiv[0]);
                if (!chosenDiv.attr("tabindex")) {
                    chosenDiv.attr("tabindex", -1);
                }
                $editor.on("chosen:hiding_dropdown", function () {
                    setTimeout(function () {
                        chosenDiv.focus();
                    }, 100);

                });
                chosenDiv.blur(function (event, triggerReason) {
                    if (triggerReason === ko.bindingHandlers.tableCRUD.triggerBlurForKOUpdate) {
                        return;
                    }
                    var drop = chosenDiv.find("div.chosen-drop");
                    if (drop.length > 0 && drop.position().left >= -100) {
                        return;
                    }
                    $endEdit();
                });
                chosenDiv.focus();
            });
        }
    });
})();
/*
binding format
data-bind = "table: {
    chosenOption: *** or {***} //the option passed to chosen function when create the chosen
    source: ***, //source items
    valueProp: *** //the property of the items in source that will be used as the value of the option
    selectedValue: *** //the value that user is selected, it can be array
    selectedValueItemProp: the prop of the items in selectedValue array, that will be used to match the value in source
    displayProp: the property of the items in source that will be used as the text of the option, it also can be a valid expression, the "this" is current item, and we can also use $parent, $parents, $data and $root
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
                _.CO.updateValue(value, $(element).val(), element, allBindingsAccessor);
                //if (ko.isObservable(value.selectedValue)) {
                //    value.selectedValue(data.selected);
                //} else {
                //    throw 'selectedValue must be bound to an observable field';
                //    //we throw this exception is becasue ,value is the binding value, will will copy from the specified property of viewModel
                //    //and if it is not a observable, then just value copy, which will not change the copied property of viewMode
                //    //value.selectedValue = data.selected;
                //}
            });
        },

        //set the bound view model property value to the selected value
        updateValue: function (databoundValue, selectedOptionValue, element, allBindingsAccessor) {
            //the value of option is alwasy the index so we must convet it to the corresponding data item
            if ($.isArray(selectedOptionValue) && databoundValue.selectedValueItemProp) {
                throw "Not supported yet";
            }
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
                var optionValue = $(element).children("[value=" + selectedOptionValueArray[i] + "]").data("item");

                if (typeof (_.UO(databoundValue.valueProp)) !== "undefined") {
                    optionValue = _.UO(optionValue[_.UO(databoundValue.valueProp)]);
                }
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
                //and if it is not a observable, then just value copy, which will not change the copied property of viewMode
                //databoundValue.selectedValue = selectedOptionValue;
            }
        },

        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            _.CO.updateSelect(element, valueAccessor(), bindingContext, viewModel);

            //for the case, if the selected value is not any option, but the chose is set to single select mode, then it will select the frist value, but won't trigger change event
            //so we force the value are always same between the element and the viewmodel
            _.CO.updateValue(valueAccessor(), $(element).val(), element, allBindingsAccessor);

            $(element).trigger("chosen:updated");
        },

        updateSelect: function (element, bindData, bindingContext, viewModel) {
            element = $(element);
            element.empty();
            var value = _.UO(bindData);
            var source = _.UO(value.source);
            if (typeof (source) === "undefined" || source == null) {
                source = [];
            }
            var valueProp = _.UO(value.valueProp);
            var selectedValue = _.UO(value.selectedValue);
            var displayProp = _.UO(value.displayProp);
            var selectedValueItemProp = _.UO(value.selectedValueItemProp);

            var selectedValueArray = [];
            if ($.isArray(selectedValue)) {
                selectedValueArray = selectedValue;
            } else {
                selectedValueArray.push(selectedValue);
            }

            function inArray(array, arrayItemProp, searchValue) {
                for (var j = 0; j < array.length; j++) {
                    var item = array[j];
                    if (arrayItemProp) {
                        item = item[arrayItemProp];
                    }
                    if (item == searchValue) {
                        return true;
                    }
                }
                return false;
            }


            for (var i = 0; i < source.length; i++) {
                var sourceItemValue = _.UO(source[i]);
                if (valueProp) {
                    sourceItemValue = _.UO(source[i][valueProp]);
                }

                var displayValue = _.UO(source[i]);
                if (displayProp) {
                    if ((displayProp in displayValue)) {
                        displayValue = _.UO(displayValue[displayProp]);
                    } else {
                        displayValue = (function () {
                            var func;
                            if (element[0][displayProp]) {
                                func = element[0][displayProp];
                            } else {
                                var funcBody = "with ($bindingContext){with($bindingContextOverride) {with ($currentItem) {return " + displayProp + ";}}}"
                                element[0][displayProp] = func = new Function("$bindingContext", "$currentItem", "$bindingContextOverride", funcBody);
                            }
                            var bindingContextOverride = {
                                $parents: bindingContext.$parents.slice(0),
                                $data: displayValue,
                                $parent: viewModel
                            };
                            bindingContextOverride.$parents.splice(0, 0, viewModel);
                            return func(bindingContext, displayValue, bindingContextOverride);
                        })();
                    }
                } else { //if displayProp is empty, it means directly show the current item

                }
                var opt;

                if (inArray(selectedValueArray, selectedValueItemProp, sourceItemValue)) {
                    opt = $('<option selected="selected" value="' + i + '">' + displayValue + '</option>');
                } else {
                    opt = $('<option value="' + i + '">' + displayValue + '</option>');
                }
                opt.data("item", _.UO(source[i]));
                element.append(opt);
            }
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
cb-ko-loopup
============

data-bind = "table: {

    source: ***, //a collection that contains all the data items to be lookup

    lookupProp: string, the property name of the item in the source

    lookupValue: the value that should be matched to the value of the property(lookupProp) of the item in source, if it is array, then all the items' corresponding display text in the array will be shown

    lookupValueItemProp: the prop of the items in loopupValue array, that will be used to match the value in source

    displayProp: the property of the item in source that should be displayed as the text of the element

    seperator: default is ",", if lookupValue is array, then each displaied item will be seperated by the seperator

}"
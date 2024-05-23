/*
    IllustratorTagEditor.jsx

    TODO
    - add color picker for placeholder color?
    - function for getting entire list of tagged items, and which tags are present

    - find out how to use .uuid property with artboards
    - Document.getPageItemFromUuid (uuid: string) : PageItem 

    Bugs:
    - if selection active outside of artboard bounds, frequent false positive on PathItem

    */

#include "../jsui.js";
#include "../Pslib.jsx";

#target illustrator;

Main( typeof uuid === "string" ? uuid : (typeof uuid === "number" ? uuid.toString() : undefined ) );

function Main( uuid )
{
    if(!app.documents.length) return;
    var doc = app.activeDocument;
    if( uuid != undefined)
    {
        var item = doc.getPageItemFromUuid(uuid); // uuid is a STRING
        if(!item) return false;
        return showUI(item);
    }

    var placeholderPatternStr = "#";
    var tags = 
    var selection = doc.selection;

    // quick check for geometry match between selected items and active artboard 

    // store current artboard specs for comparison with selected objects
    var initialArtboardSelection = doc.artboards.getActiveArtboardIndex();
    var initialArtboard = doc.artboards[initialArtboardSelection];
    var initialArtboardCoords = Pslib.getArtboardCoordinates(initialArtboard);

    var selectionMatchesActiveArtboard = false;
    var itemFound = false;
    var item;

    if(selection.length)
    {
        selectionMatchesActiveArtboard = Pslib.getItemsOverlapArtboard( selection, initialArtboard, false );

        if(selectionMatchesActiveArtboard)
        {
            item = Pslib.getArtboardItem(initialArtboard, placeholderPatternStr, selection);
            if(item) itemFound = true;
        }
        else
        {
            // if selected item is a PathItem with the target name, but is outside of artboard bounds
            // attempt to get corresponding artboard match from item bounds
            var artboardIndexes = Pslib.getArtboardsFromSelectedItems( selection, false, true ); // array of artboard indexes
            var artboardLocated = false;
            if(artboardIndexes.length)
            {
                doc.artboards.setActiveArtboardIndex(artboardIndexes[0]);
                artboardLocated = true;
            }

            if(artboardLocated) 
            {
                item = Pslib.getArtboardItem(initialArtboard, placeholderPatternStr);
                if(item) itemFound = true;
              //  return itemFound ? Main(item) : false;
            }

        }
    }
    else
    {
        // if no selection active, look for placeholder item, select it, and restart process
        item = Pslib.getArtboardItem(initialArtboard, placeholderPatternStr);
        if(item) itemFound = true;
        return itemFound ? Main(item) : false;
    }

    if (!itemFound)
    {
        var confirmCreateNew = false;
        // confirmCreateNew = JSUI.confirm( "No placeholder item found on artboard \""+initialArtboard.name+"\". Create new?" );
        confirmCreateNew = confirm( "No placeholder item found on artboard \""+initialArtboard.name+"\". Create new?" );

        if(confirmCreateNew)
        {
            var artboard = Pslib.getActiveArtboard();
            var indexNum = doc.artboards.getActiveArtboardIndex();
            var pageNum = indexNum+1;

            var layerRef;
            try{layerRef = doc.layers.getByName("Placeholders")}catch(e){};

            // var tags = [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ];
            var tags = [ ["assetID", ""] ]; // uuid conquers all

            var rectObj = { artboard: artboard, name: placeholderPatternStr, tags: tags, hex: undefined, opacity: undefined, layer: layerRef, sendToBack: true  };

            item = Pslib.addArtboardRectangle( rectObj );
 
            doc.selection = item;
            return Main(item);
        }
        else
        {        
            doc.selection = selection;
        }
    }
}

function showUI(item)
{
    var doc = app.activeDocument;
    var item = item;
    var itemUuid = item.uuid;
    var artboard = Pslib.getActiveArtboard();
    var artboardIndex = doc.artboards.getActiveArtboardIndex();
    var artboardName = artboard ? artboard.name : "";

    var tags = Pslib.scanItemsForTags( [item], "PathItem" )[0];
    var listBoxSelection = 0;
    // autoselect "assetID" tag if present
    for(var i = 0; i < tags.length; i++) { if(tags[i][0] == "assetID"){ listBoxSelection = i; break; } }

    var win = new JSUI.createDialog( { title: "Tag Editor", orientation: "column", margins: 15, spacing: 10, alignChildren: "fill", width: 0, height: 0, debugInfo:false } );

    var documentLabel = win.addRow( { alignment: "center" });

    var documentLabelStr = doc.name + "  [ Artboard " + (artboardIndex+1) + ": " + artboardName + " ]  " + item.typename + " uuid " + itemUuid +":  " + item.name;

    documentLabel.addStaticText( { text: documentLabelStr, multiline: false, alignment: "left" } );

    var mainContainer = win.addRow( { spacing: 10 } );

    var listboxColumn = mainContainer.addColumn();
    var listboxPanel = listboxColumn.addPanel( { label: "Existing tags", width: 400, margins: 15, alignChildren: "fill" } );
    listboxPanel.alignment = "fill";
    var tagsListbox = listboxPanel.addListBox( "tagsListbox", { list: tags, selection: listBoxSelection, width: 300, height: 180, alignment: "fill" });

    ////

    // listbox callbacks
    tagsListbox.onChange = function()
    {
        if(tagsListbox.selection != null)
        {
            var splt = tagsListbox.selection.toString().split(",");
            var value = splt[1];

            tagNameEditText.text = splt[0];

            if(splt.length > 2)
            {
                for(var i = 2; i < splt.length; i++)
                {
                    value += (i < splt.length ? "," : "")+splt[i];
                }
            }
            tagValueEditText.text = value;
        }
        return;
    }
    
    tagsListbox.update = function()
    {
        // store current length, selection
        var currentLength = tagsListbox.items.length;
        
        // store selected item text
        var currentSelection = tagsListbox.selection != null ? tagsListbox.selection.text : null;

        // // get properties from object
        var tags = tags = Pslib.scanItemsForTags(item, "PathItem")[0];
        
        // remove items from list
        tagsListbox.removeAll();
        
        if(tags.length)
        {
            for(var j = 0; tagsListbox.items.length < tags.length; j++)
            {  
                var item = tagsListbox.add ("item", tags[j].toString());
                            
                if(currentSelection != null)
                {
                    if(item.text == currentSelection)
                    {
                        tagsListbox.selection = item;
                    }
                    else if(tagsListbox.items.length > currentLength)
                    {
                        tagsListbox.selection = tagsListbox.items[tags.length-1];
                    }
                }
            }
            tagsListbox.onChange();
        }
        return;
    }

    /////

    var editColumn = mainContainer.addColumn( { spacing: 10 });
    var setTagsPanel = editColumn.addPanel( { label: "Edit tag", alignment: "fill", margins: 15} );

    var nameRow = setTagsPanel.addRow( { alignment: "right", spacing: 0} );
    var tagNameEditText = nameRow.addEditText("undefined", { label: "Name:", characters: 30 });
    tagNameEditText.onChanging = function(){}; // make sure JSUI does not track the value for these
    tagNameEditText.onChange = function(){};
    
    var valueRow = setTagsPanel.addRow( { alignment: "right", spacing: 0} );
    var tagValueEditText = valueRow.addEditText("undefined", { label: "Value:", characters: 30 });
    tagValueEditText.onChanging = function(){}; 
    tagValueEditText.onChange = function(){ if(tagNameEditText.text && tagValueEditText.text) setTagslbBtn.onClick() };

    // update edittext values
    if(tagsListbox.selection!=null)
    {
        var splt = tagsListbox.selection.toString().split(",");
        tagNameEditText.text = splt[0];
        tagValueEditText.text = splt[1];
    }

    var setremoveRow = setTagsPanel.addRow( { spacing: 10 });
    // var setTagsBtn = setremoveRow.addButton( { label: "Set" });
    // var setTagslbBtn = setremoveRow.addButton( { label: "Set" });
    var setTagslbBtn = setremoveRow.addCustomButton( { label: "Set", width: 75 });
    var removeTagsBtn = setremoveRow.addButton( { label: "Remove" });

    var advancedOptionsPanel = editColumn.addPanel( { label: "Advanced", orientation: "row", spacing: 10, alignment: "fill", margins: 15} );
    var autoTagBtn = advancedOptionsPanel.addButton( { label: "Auto-Tag", helpTip: "Automatically add tags based on artboard name and index" });
    var clearAllTagsBtn = advancedOptionsPanel.addButton( { label: "Clear All", helpTip: "Remove all tags" });

    setTagslbBtn.onClick = function ( )
    {
        var name = tagNameEditText.text.trim();
        var value = tagValueEditText.text.trim();

        if(name != "")
        {
            Pslib.setTags( item, [ [ name, value ] ] );
            tagsListbox.update();
        }
        return;
    }

    removeTagsBtn.onClick = function ( )
    {
        var name = tagNameEditText.text.trim();
        if(name != "")
        {
            Pslib.removeTags( item, [ name ]  );
            tagsListbox.update();

            tagNameEditText.text = "";
            tagValueEditText.text = "";
        }
        return;
    }

    clearAllTagsBtn.onClick = function()
    {
        Pslib.removeAllTags(item);
        tagsListbox.update();
        return;
    } 

    autoTagBtn.onClick = function()
    {
        Pslib.setTags( item, [ ["name", artboardName], ["index", artboardIndex], ["page", artboardIndex+1], ["assetID", ""] ]);
        tagsListbox.update();
        return;
    }

    tagValueEditText.active = true;
    // win.addCloseButton();
    win.addButton({ label: "Close", name: "ok", alignment: "center"});

    return win.show();
}
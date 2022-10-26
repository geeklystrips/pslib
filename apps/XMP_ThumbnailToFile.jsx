/*

    apps/XMP_ThumbnailToFile.jsx

*/

#target illustrator;

#include "../jsui.js";

Main();

function Main()
{
    if(!app.documents.length)
    {
        alert("No active document");
        return;
    }
    var thumbnail =  extractThumbnail();
}


function extractThumbnail(doc, outputFile)
{
    if(!doc) var doc = app.activeDocument;

    var path = JSUI.getDocumentFullPath();

    if(!path)
    {
        alert("Document does not have a valid path.\nSave it to disk and try again.");
        return;
    }

    if(!outputFile) var outputFile = path.toString().getFileNameWithoutExtension() + "_thumbnail.jpg";

    var data = getThumbnailData(doc);
    
    if(data)
    {
        var jpegThumbFile = writeToBinFile(outputFile, data);
        return jpegThumbFile;
    }
    return
}

function writeToBinFile(fileURI, BinStr)
{
    var content = JSUI.decode64(BinStr);

    var file = new File(fileURI);
    file.encoding = 'binary';
    file.open('w');
    file.write(content);
    file.close();

    return file;
}


function getThumbnailData(doc)
{
    var isIllustrator = app.name == "Adobe Illustrator";
    if(!ExternalObject.AdobeXMPScript)
    {
        ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
    }

    var xmp = new XMPMeta( isIllustrator ? doc.XMPString : doc.xmpMetadata.rawData );

    // if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
    // else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
    // alert( xmp.serialize());

    // xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    // xmlns:xmpGImg="http://ns.adobe.com/xap/1.0/g/img/"

    var namespace = "http://ns.adobe.com/xap/1.0/";
    var propertyName = "Thumbnails";

    var xmpThumb = xmp.getProperty(namespace, propertyName); // nah

    var arr = [];

    // PSD and AI files have this structure. array[5] is image content
//     <xmp:Thumbnails>
//     <rdf:Alt>
//        <rdf:li rdf:parseType="Resource">
//           <xmpGImg:width>256</xmpGImg:width>
//           <xmpGImg:height>232</xmpGImg:height>
//           <xmpGImg:format>JPEG</xmpGImg:format>
//           <xmpGImg:image>/9j/4AAQSkZJRgABAgEASABIAAD/ [...]
//           </xmpGImg:image>
//        </rdf:li>
//     </rdf:Alt>
//  </xmp:Thumbnails>

    // this gets an array that corresponds to the values of each array item
    if(xmp.doesPropertyExist(namespace, propertyName))
    {
   			// get array items
			// var iterator = xmp.iterator( XMPConst.ITERATOR_JUST_LEAFNODES, 
			var iterator = xmp.iterator( XMPConst.ITERATOR_JUST_LEAFNAMES, 
				namespace,
				propertyName
				);

			while(true)
			{
				var item = iterator.next();
				if (item)
				{ 
					if($.level) $.writeln(item.value);
					arr.push(item.value);
					// arr.push([ item.key, item.value ]);
					// alert("_getArray()  " + arrName + ": " + item.value);
				} 
				else
				{ 
					break; 
				}
			}

            // var struct = xmp.getStructField(namespace,    // Namespace
			// 						objName,    					// Structure name
			// 						namespace,    					// Field type namespace
			// 						propertyName           				// Key

            return(arr[5]);
    }
    // alert(xmpThumb.serialize())
    // return content of <xmpGImg:image>/9j/4AAQSkZJRgABAgEASABIAAD/ [...]
    return
}




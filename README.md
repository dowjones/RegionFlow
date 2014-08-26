RegionFlow
==========

RegionFlow flows content into a region with fixed width and height. It can append an ellipse to content that is flowed into the region if the full content overflows the region's dimensions or an endsign if the content does fit within the region's dimensions. Any content that overflows the region is returned, allowing content to span across several region elements.

RegionFlow can be called either with arguments:
```
regionflow(region[, content][, ellipse][, endsign])
```
or with an options object that has the same properties as the arguments above:
```
regionflow(options)
```

**region** Either a selector string (such as '#region', '.region') or a HTML element (document.getElementById('region')).

**content** Default is the content already contained within the region. If specified, it must be a string; any string that might be used as the value of an element's `innerHTML` property should be fine.

**ellipse** No default value; if the content overflows the region's dimensions, an ellipse will be displayed only if a string value for the ellipse has been explicitly defined.

**endsign** No default value; if the content does not overflow the region's dimensions, an endsign will be displayed only if a string value for the endsign has been explicitly defined.


### Example:
```
var flowA = regionflow('#regionA')
var flowB = regionflow('#regionB', flowA, '»')
var flowC = regionflow({
  region: '#regionC',
  content: flowB,
  ellipse: '&nbsp;»',
  endsign: '&nbsp;◼'
})
```

Above, RegionFlow captures the content that overflows #regionA so it can be flowed into #regionB. If the content overflows #regionB's dimensions, RegionFlow appends "»" to #regionB's content. The overflow from #regionB is then flowed into #regionC. Because both `ellipse` and `endsign` are defined, if the value of `flowB` overflows #regionC's dimensions then #regionC's content will end with a "»", but if it does not overflow #regionC's dimensions then the content will end with a "◼".

### Live Examples:
* [basic example](http://dowjones.github.io/RegionFlow/demo/basic.html)
* [columns example](http://dowjones.github.io/RegionFlow/demo/columns.html)
* [subtractive example](http://dowjones.github.io/RegionFlow/demo/2-col-subtractive.html)

### Tips:
- To prevent an ellipse from dropping onto a new line as an orphan, prefix the ellipse string with a `&nbsp;`.
- RegionFlow works by duplicating and splitting XML nodes across regions, so if a paragraph overflows from one region to a second through multiple RegionFlow calls (such as when the overflow `flowA` from the first call above is used as the content for the next call), the paragraph will be split in two with the second part becoming the first paragraph of the second region. This can cause odd styling issues in some cases, such as if the paragraph is styled with a non-zero `text-indent` value which will cause both paragraph parts to be indented when only the first should be. To prevent this, disable indentation on first-child paragraphs of non-first regions:
```
.region + .region p:first-child { text-indent: 0; }
```
- RegionFlow can be used to support `column-count` in IE9. Just draw the columns as `div` elements with fixed width and height and flow the content from `div` to `div`.

This project was developed by Adrian Lafond, with input from Erin Sparling, and is maintained by Dow Jones.

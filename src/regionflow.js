;(function (root) {
  'use strict';

  // Constants for assessing object type.
  var STRING = '[object String]';
  var OBJECT = '[object Object]';

  // Constants for assessing node type.
  var ELEMENT = 1;
  var TEXT    = 3;

  // Constant for splitting word blocks.
  var WORD_BOUNDS = ' ,:;.?-–—/\\\'"“”‘’‛‟′″[]{}()'.split('');
  var WORD_BOUNDS_LENGTH = WORD_BOUNDS.length;
  var SPACE = ' ';



  // ## regionflow
  // This public function checks the validity of the arguments before
  // instantiating a private Flow instance. It can be called staticly
  // either with the parameters listed directly:
  //   regionflow(block, content, ellipse, forceEllipse)
  //   @param {HTMLElement|string} region
  //   @param {=string} content
  //   @param {=string} ellipse
  //   @param {=string} endsign
  // or with an options object:
  //   regionflow(options)
  // that must have the same properties as the parameters above.
  // @param region is mandatory; it must be a block-level HTML element or a
  //   selector string that evaluates to a block-level HTML element. The
  //   element must have fixed width and height set.
  // @param content is optional. If set, it must be a string that can be used
  //   as an innerHTML value; i.e., region.innerHTML = content. If not set, the
  //   region's pre-existing content will be used.
  // @param ellipse is optional. If set and the content exceeds the bounds of
  //   the region, the ellipse will be appended to the end of the content.
  // @param endsign is optional. If set and the content does not exceed the,
  //   the bounds of the region, it will be appended to the end of the content.
  function regionflow() {
    var arg0 = arguments[0];
    var region = null;
    var content = null;
    var ellipse = null;
    var endsign = null;

    // Parse the arguments.
    if (arg0 && arg0.nodeType === ELEMENT) {
      // First argument is an HTML element.
      region = arg0;
    } else if (arg0 && toStr(arg0) === STRING) {
      // First object is a selector string.
      region = document.querySelector(arg0);
    } else if (toStr(arg0) === OBJECT) {
      // First argument is an options object.
      return regionflow(arg0.region, arg0.content, arg0.ellipse, arg0.endsign);
    }

    if (!!region) {
      // Find content.
      content = !!(arguments[1] && toStr(arguments[1]) === STRING) ?
        arguments[1] :
        region.innerHTML;
      if (!content) {
        // No content so return null values.
        return null;
      }

      // Find ellipse.
      ellipse = !!(arguments[2] && toStr(arguments[2]) === STRING) ?
        arguments[2] :
        null;

      // Find endsign.
      endsign = !!(arguments[3] && toStr(arguments[3]) === STRING) ?
        arguments[3] :
        null;

      var flow = new Flow(region, content, ellipse, endsign);
      return convertXmlToStr(flow.contentXml);

    } else {
      throw 'RegionFlow error: "region" could not be defined.';
    }
  }


  // Util for parsing regionflow arguments.
  function toStr(value) {
    return Object.prototype.toString.call(value);
  }



  // Instantiable Flow class. Arguments will have already been
  // validated in regionflow().
  function Flow(region, content, ellipse, endsign) {
    var tmpEl;
    this.region = region;
    this.bounds = region.getBoundingClientRect();

    // Convert content to XML.
    this.contentXml = convertStrToXml(content);

    if (ellipse) {
      tmpEl = document.createElement('p');
      tmpEl.innerHTML = ellipse;
      this.ellipse = tmpEl.textContent;
    } else {
      this.ellipse = null;
    }

    if (endsign) {
      tmpEl = document.createElement('p');
      tmpEl.innerHTML = endsign;
      this.endsign = tmpEl.textContent;
    } else {
      this.endsign = null;
    }
    this.prevTextNode = null;

    // For storing nodes that have been completely flowed and must be
    // removed from the original content.
    this.nodesToRemove = [];

    // When true, flow is complete and must stop.
    this.flowComplete = false;

    // Temporarily empty the region element and make its height dynamic.
    this.region.innerHTML = '';
    this.region.style.height = 'auto';

    this.flow(this.contentXml, this.region);
    this.removeFlowedNodes();
    if (this.endsign && this.flowComplete) {
      this.removeEllipse(this.endsign);
    }
    this.region.style.height = this.bounds.height + 'px';
  }


  Flow.prototype = {


    // The first method called to start the flow process off and also the
    // method through which every element node in the content XML passes.
    // @param contentNode The element or text node of the original content.
    // @param targetNode The parent/target node that the content should be
    //   copied into.
    flow: function (contentNode, targetNode) {
      var textContent = !!contentNode.textContent;

      for (var child = contentNode.firstChild; !!child; child = child.nextSibling) {
        switch (child.nodeType) {
          case ELEMENT:
            this.flowNode(child, targetNode);
            break;
          case TEXT:
            this.flowText(child, targetNode);
            break;
        }
        if (this.flowComplete) {
          break;
        }
      }

      if (!textContent || (textContent && !contentNode.textContent)) {
        this.nodesToRemove.push(contentNode);
      }
    },


    // Create an empty copy of @param contentNode and append it to
    // @param targetNode. Run children back through flow().
    flowNode: function (contentNode, targetNode) {
      var nodeCopy = contentNode.cloneNode(false);
      var childCopy;
      var textContent = !!contentNode.textContent;
      var childTextContent;
      targetNode.appendChild(nodeCopy);

      // If merely adding an empty node pushed the content out of bounds,
      // remove the node and stop flowing content. The nodeCopy could be
      // an <img> or a floating spacer <div>.
      if (this.fitComplete || this.overflows()) {
        // console.log('flowNode() overflow A')
        targetNode.removeChild(nodeCopy);
        return;
      }

      for (var child = contentNode.firstChild; !!child; child = child.nextSibling) {
        switch (child.nodeType) {
          case ELEMENT:
            childTextContent = !!child.textContent;
            childCopy = child.cloneNode(false);
            nodeCopy.appendChild(childCopy);
            this.flow(child, childCopy);

            // If the original child node has text content but the flowed copy
            // does not, then remove the flowed copy because it is no more
            // than an empty text container that makes no sense without content.
            if (childTextContent && !childCopy.textContent) {
              nodeCopy.removeChild(childCopy);
            }
            break;

          case TEXT:
            this.flowText(child, nodeCopy);
            break;
        }
        if (this.flowComplete) {
          // console.log('flowNode() overflow B');
          break;
        }
      }

      if (!textContent || (textContent && !contentNode.textContent)) {
        this.nodesToRemove.push(contentNode);
      }
    },


    // Flow @param node.nodeValue (text) into @param parentNode until/unless
    // the region's height overflows the fixed height.
    // Returns text that does not fit into the flow.
    flowText: function (node, targetNode) {
      var words = this.asWordBlocks(node.nodeValue);
      var textA;
      var textB;
      var textE;
      var nodeCopy = node.cloneNode(false);

      // If text node is *only* whitespace, do not append ellipse.
      var onlyWhite = isOnlyWhite(node.nodeValue);
      var ellipse = (!!this.ellipse && !onlyWhite) ? this.ellipse : '';
      var endsign = (!!this.endsign && !onlyWhite) ? this.endsign : '';
      var prevTextNodeValue;

      if (ellipse) {
        prevTextNodeValue = this.removeEllipse();
      }
      if (endsign) {
        prevTextNodeValue = this.removeEllipse(endsign);
        words.push(endsign);
      }

      // Add a copy of the node to the targetNode.
      nodeCopy.nodeValue = textA = '';
      targetNode.appendChild(nodeCopy);

      // Add text to the new node copy.
      for (var i = 0, wordslen = words.length; i < wordslen; i++) {
        textB = [textA, words[i]].join('');
        textE = ellipse ? (textB + ellipse) : textB;
        nodeCopy.nodeValue = textE;

        if (this.overflows()) {

          if (isOnlyWhite(textA)) {
            // Do not add an ellipse if this text is only whitespace.
            nodeCopy.nodeValue = textA;
            if (this.prevTextNode) {
              this.prevTextNode.nodeValue = prevTextNodeValue + ellipse;
            }

          } else {
            // Ellipse will be added to the current text node, so remove it
            // from the previous text node.
            this.removeEllipse();
            nodeCopy.nodeValue = [
              // Trim whitespace from the right so that the ellipse will fit
              // snug, allowing ellipse values such as '&nbsp;»' to not break
              // onto new lines.
              textA.replace(/\s+$/, ''),
              ellipse
            ].join('');
          }

          if (endsign) {
            // Remove the ellipse from the words array or it will be added to
            // the original content.
            words = words.slice(0, wordslen - 1);
          }
          break;
        } else {
          // nodeCopy.nodeValue = [textA.replace(/\s+$/, ''), ellipse].join('');
          nodeCopy.nodeValue = textB;
        }
        textA = textB;
      }

      // Write the overflow text to the original node and remove the node
      // if it does note have any text.
      node.nodeValue = words.slice(i).join('');
      if (!node.nodeValue) {
        this.nodesToRemove.push(node);
      }

      if ((ellipse || endsign) && !!nodeCopy.nodeValue) {
        this.prevTextNode = nodeCopy;
      }
    },


    // Removes the ellipse from the end of prevTextNode as it will be
    // added to the end of the current node instead.
    removeEllipse: function (ellipse) {
      var str = null;
      ellipse = ellipse || this.ellipse;
      if (this.prevTextNode && ellipse) {
        str = this.prevTextNode.nodeValue;
        var lastIndex = str.lastIndexOf(ellipse);
        if (lastIndex !== -1) {
          this.prevTextNode.nodeValue = str.substr(0, str.length - ellipse.length);
        }
      }
      return str;
    },


    // Splits @param {string} text into an array of word blocks.
    asWordBlocks: function (text) {
      var words = [];
      var chars = text.split('');
      var i, ilen, j, c;
      var str = '';
      var prevWord;

      for (i = 0, ilen = chars.length; i < ilen; i++) {
        c = chars[i];
        str += c;
        for (j = 0; j < WORD_BOUNDS_LENGTH; j++) {
          if (c === WORD_BOUNDS[j]) {
            if (str !== SPACE || (str === SPACE && prevWord !== SPACE)) {
              words.push(str);
            }
            prevWord = str;
            str = '';
            break;
          }
        }

        if (i === ilen - 1 && str !== '') {
          words.push(str);
        }
      }

      return words;
    },


    // Does the content fit within the bounds?
    overflows: function () {
      this.flowComplete = this.region.getBoundingClientRect().height > this.bounds.height;
      return this.flowComplete;
    },



    // Remove nodes from the original content that have used completely in the
    // flowed content.
    removeFlowedNodes: function () {
      var n;
      for (var i = 0, len = this.nodesToRemove.length; i < len; i++) {
        n = this.nodesToRemove[i];
        if (!!n.parentNode) {
          n.parentNode.removeChild(n);
        }
      }
    }
  };


  // Returns true is @param {string} str is only whitespace.
  function isOnlyWhite(str) {
    return (str === '') || /^\s+$/m.test(str);
  }



  // Converts @param content to XML wrapped in a `<div>` element.
  function convertStrToXml(content) {
    var xml = document.createElement('div');
    xml.innerHTML = content;
    return xml;
  }


  // Converts @param xml to a string sans its wrapping element.
  function convertXmlToStr(xml) {
    var xmlS = new XMLSerializer();
    var str = '';
    var child;
    for (var i = 0, len = xml.childNodes.length; i < len; i++) {
      child = xml.childNodes[i];
      if (child.nodeType === ELEMENT || child.nodeType === TEXT) {
        str += xmlS.serializeToString(child);
      }
    }
    return str;
  }




  // Export.
  if (typeof define === 'function' && define.amd) {
    // RequireJS/AMD.
    define(function () {
      return regionflow;
    });
  } else {
    // Global var.
    root.regionflow = regionflow;
  }

})(this);

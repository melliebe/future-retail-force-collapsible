(function(d3) {
  var w = 1200,
      h = 900,
      node,
      link,
      label,
      root;

  var force = d3.layout.force()
        .on("tick", tick)
        .charge(function(d) {
          return d.r * -600;
        })
        .gravity(0.1)
        .friction(0.05)
        .linkDistance(function(d) {
          return Math.sqrt(d.source.size / 2);
        })
        .size([w, h]);

  var vis = d3.select("body").append("svg:svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", w + "px")
        .attr("height", h + "px");

  var json = bubbleData;

  root = json;
  root.fixed = true;
  root.x = w / 2;
  root.y = h / 2 - 80;

  var nodes = vis.selectAll("g")
        .data(flatten(root));

  update();

  flatten(root).forEach(function( node ){
    toggleChildren(node);
  });

  update();

  function update() {
    var nodes = flatten(root),
        links = d3.layout.tree().links(nodes);

    // Restart the force layout.
    force
      .nodes(nodes)
      .links(links)
      .start();

    // Update the links…
    link = vis.selectAll("line.link")
      .data(links, function(d) { return d.target.id; });

    // Enter any new links.
    link.enter().insert("svg:line", ".node")
      .attr("class", "link")
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    // Exit any old links.
    link.exit().remove();

    // Update the nodes…
    node = vis.selectAll("circle.node")
      .data(nodes, function(d) { return d.id; })
      .style("fill", color);

    var minWidth = 40;
    function r(d) {
      d.r = Math.log(d.size/900) * 20;
      d.r = d.r < minWidth ? minWidth : d.r;
      return d.r;
    }

    node.transition()
      .attr("r", r);

    // Enter any new nodes.
    node.enter().append("svg:circle")
      .attr("class", "node")
      .attr("cx", function(d) { return d.x + Math.random(); })
      .attr("cy", function(d) { return d.y + Math.random(); })
      .attr("r", r)
      .style("fill", color)
      .call(force.drag)
      .on("click", click)
      .on("touchend", click);

    // Exit any old nodes.
    node.exit().remove();

    label = vis.selectAll("text")
      .data(nodes, function(d) { return d.id; });

    label
      .enter()
      .append("svg:text")
      .text(function(d) {
        return d.name;
      })
      .call(force.drag)
      .on("click", click)
      .on("touchend", click);

    label.exit().remove();


    // check the bounding box on the text a couple times
    // to make sure it fits into the associated circle
    label.attr("font-size", function(d){
        d.fontSize = d.r / 2;
        return d.fontSize;
      })
      .attr("font-size", function(d){
        var diameterThresh = d.r * 1.8;
        var bbox = this.getBBox();

        if( bbox.width >= diameterThresh ){
          d.fontSize = (diameterThresh / d.name.length) * 2;
        }

        return d.fontSize;
      })
      .attr("font-size", fontSize)
      .attr("font-size", fontSize)
      .attr("class", function(d){
        if( !d._children && !d.children ){
          return "child";
        }
      });
  }

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

    label
      .attr( "x", function(d){
        var bbox = this.getBBox();
        var diameter = d.r * 2;
        var leftOffset = (diameter - bbox.width) / 2;

        return d.x - d.r + leftOffset;
      })
      .attr("y", function(d) {
        var bbox = this.getBBox();
        return d.y + (bbox.height/4);
      });
  }

  // Color leaf nodes orange, and packages white or blue.
  function color(d) {
    return d._children ? "#e23120" : d.children ? "#e23120" : "#29292b";
  }

  function openChildren(d){
    if( d._children ){
      d.children = d._children;
      d._children = null;
    }
  }

  function toggleChildren(d){
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      openChildren(d);
    }
  }


  function focusNode(d){
    var desc = document.querySelector(".description");

    if( desc && d.desc ){
      description(desc, d);

      desc.style.display = "block";
    } else {
      desc.style.display = "none";
    }
  }


  // Toggle children on click.
  function click(d) {
    var desc = document.querySelector(".description");

    desc.innerHTML = (d3.event.defaultPrevented);
    desc.style.display = "block";

    toggleChildren(d);
    focusNode(d);
    update();
  }

  // Returns a list of all nodes under the root.
  function flatten(root) {
    var nodes = [], i = 0;

    function recurse(node) {
      if (node.children) node.size = node.children.reduce(function(p, v) {
        return p + recurse(v);
      }, 0);

      if (!node.id) node.id = ++i;
      nodes.push(node);
      return node.size;
    }

    root.size = recurse(root);
    return nodes;
  }

  var basicTemplate = document.querySelector("#basic-template").innerHTML;
  var basicTemplateRelated = document.querySelector("#basic-template-related").innerHTML;
  var complexTemplate = document.querySelector("#complex-template").innerHTML;

  function interpBasicTemplate(name, desc, template) {
    return (template || basicTemplate)
      .replace( "{{name}}", name )
      .replace( "{{paragraphs}}", desc.paragraphs.reduce(function(acc, p) {
        return acc + "<p>" + p + "</p>";
      }, ""));
  }


  function interpBasicTemplateRelated(name, desc, template) {
    return interpBasicTemplate(name, desc, template || basicTemplateRelated)
      .replace( "{{related}}", desc.related.reduce(function(acc, r){
        return acc +
          "<li>" +
          "<a href='#' data-node-name='" + r + "'>" +
          r +
          "</a>" +
          "</li>";
      }, ""));
  }

  function interpComplexTemplate(name, desc){
    return interpBasicTemplateRelated(name, desc, complexTemplate)
      .replace( "{{imgsrc}}", desc.imgsrc)
      .replace( "{{meaning}}", desc.meaning.reduce(function(acc, m){
        return acc +
          "<li>" +
          m +
          "</li>";
      }, ""));
  }

  function description(element, node){
    var interp, desc = node.desc;

    // TODO all of this goes away with a handlebars/mustache and partials
    // structured content
    if( desc.paragraphs ){

      // related denotes a more complex layout, o/w use a basic template
      if( desc.related ) {

        // images denote the most complex layout, o/w just related
        if( desc.imgsrc ){
          element.innerHTML = interpComplexTemplate(node.name, desc);
        } else {
          element.innerHTML = interpBasicTemplateRelated(node.name, desc);
        }
      } else {
        element.innerHTML = interpBasicTemplate(node.name, desc);
      }

      bindRelated(element);
    } else {
      // raw html
      element.innerHTML = desc || "";
    }
  }

  function bindRelated(element) {
    var anchors = [].slice.call(element.querySelectorAll( "[data-node-name]" ));

    anchors.forEach(function(a) {
      a.addEventListener("click", function( event ) {
        var name = a.getAttribute("data-node-name");

        openNode(name);

        event.preventDefault();
      });
    });
  }

  function openNode(name){
    var path = findPath(name, [], root);

    path.forEach(function(node){
      openChildren(node);
    });

    focusNode(path[path.length - 1]);
    update();
  }

  function findPath(name, path, node){
    path = [].slice.call(path);
    path.push(node);

    if( node.name === name ){
      return path;
    }

    var childPath;

    // NOTE could do a reduce here, meh.
    (node._children || node.children || []).forEach(function(child){
      if( childPath ){
        return;
      }

      childPath = findPath(name, path, child);
    });

    return childPath;
  }

  function fontSize(d){
    var diameterThresh = d.r * 1.7;
    var bbox = this.getBBox();

    if( bbox.width >= diameterThresh ){
      d.fontSize = d.fontSize * 0.9;
    }

    return d.fontSize;
  }
})(window.d3);

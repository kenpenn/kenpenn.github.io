/*
 * html5devconf 2014 force-directed graph example
 * JSON generated from sessions.html
 */
(function () {
  if (!window.h5dc) { window.h5dc = {}; }
  h5dc.fd = (function () {
    var fd = {
      svgBox  : d3.select('.fd-svg-box'),
      svg     : d3.select('.fd-svg-box svg'),
      height  : 0,
      width   : 0,
      node    : '',
      link    : '',
      root    : '',
      names   : {
        sessTime : 'Session Times',
        room     : 'Rooms'
      },
      init    : function (data) {
        // click handlers for the display buttons
        var btnTimes  = d3.select('#fd-btn-times')
                          .on('click', fd.dspTimes),
            btnRooms  = d3.select('#fd-btn-rooms')
                          .on('click', fd.dspRooms);

        // save the json
        fd.sessions = data;

        // generate objects for the force-directed graphs
        // with the necessary properties
        fd.genTimes();
        fd.genRooms();

        // resize and restart the graph after window resize
        window.addEventListener('resize', fd.debounce(fd.resize, 200, false));

        fd.dspTimes();
      },

      setDims : function () {
        // set the dimensions for the svg el, set the forces for the graph
        fd.height = fd.svgBox.node().getBoundingClientRect().height;
        fd.width = fd.svgBox.node().getBoundingClientRect().width;
        fd.svg.attr('height', fd.height)
              .attr('width', fd.width);

        fd.force = d3.layout.force()
          .on('tick', fd.tick)
          .size([fd.width, fd.height]);
      },

      resize : function () {
        fd.setDims();
        fd.update(fd.icon);
      },

      genTimes : function () {
        var keys    = ['sortTime','speaker'],
            byTimes = fd.sortByKeys(keys, fd.clone(fd.sessions)),
            timeVals;

        timeVals = d3.nest()
                     .key(function(d) { return d.sessTime; })
                     .entries(byTimes);

        fd.timeTree =  {
          key     : 'sessTime',
          values  : timeVals
        };
      },

      dspTimes : function () {
        fd.setDims();
        fd.icon = 'clock';
        fd.root = fd.clone(fd.timeTree);
//        fd.slugDsp([fd.icon, 'Times','Speaker']);
        fd.update('clock');
      },

      genRooms : function () {
        var keys    = ['room','speaker'],
            byRooms = fd.sortByKeys(keys, fd.clone(fd.sessions)),
            roomVals;

        roomVals = d3.nest()
                     .key(function(d) { return d.room; })
                     .entries(byRooms);

        fd.roomTree =  {
            key     : 'room',
            values  : roomVals
        };
      },

      dspRooms : function () {
        fd.setDims();
        fd.icon = 'compass';
        fd.root = fd.clone(fd.roomTree);
//        fd.slugDsp(['Room','Speaker']);
        fd.update('compass');
      },

      update : function (icon) {
        var root    = fd.clone(fd.root),
            nodes   = fd.flatten(root),
            links   = d3.layout.tree().links(nodes),
            fitDim  = Math.min(fd.width,fd.height)
            fit     = Math.sqrt(nodes.length / (fitDim * fitDim)),
            charge  = (-10 / fit),
            gravity = (12 * fit);

        // restart the force layout
        fd.force.charge(charge)
                .chargeDistance(fitDim * 2)
                .linkDistance(20)
                .gravity(gravity)
                .nodes(nodes)
                .links(links)
                .start();

        fd.svg.selectAll('line.link').remove()
        fd.svg.selectAll('g.node').remove();
        d3.selectAll('.fd-popup').remove();

        // Update the links…
        fd.link = fd.svg.selectAll('line.link')
                        .data(links, function(d) { return d.target.id; });

        // Enter any new links.
        fd.link.enter().insert('line', '.node')
          .attr('class', 'link')
          .attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });

        // Exit any old links.
        fd.link.exit().remove();

        // Update the nodes…
        fd.node = fd.svg.selectAll('g.node')
                        .data(nodes, function(d) { return d.id; })

        // Enter any new nodes.
        fd.node.enter()
               .append('g')
               .classed('node', true)

               .call(fd.force.drag);

        fd.node.each(function(d) {
          var select = d.spriteClass ? '#fd-defs .speaker' : '#fd-defs .' + icon,
              group = d3.select(d3.select(select).node().cloneNode(true)),
              pattern,
              image,
              circle,
              text,
              key, rect;

          group.datum(d);

          if (d.spriteClass) {
            d3.select(this).on('click', fd.popDsp)

            pattern = group.select('pattern')
                           .attr('id', function (d) { return 'pattern-' + d.spriteClass});

            image = pattern.select('image')
                           .attr('x', function (d) { return fd.offsets[d.spriteClass][0]})
                           .attr('y', function (d) { return fd.offsets[d.spriteClass][1]});

            circle = group.select('circle')
                          .attr('fill', function (d) { return 'url(#pattern-' + d.spriteClass + ')'})

          } else {
            key = d.key === 'sessTime' ? 'Session Times' : d.key === 'room' ? 'Rooms' : d.key;
            group.selectAll('text')
                 .text(key);
          }
          this.appendChild(group.node());
            if (!fd.once && !d.spriteClass) {
              fd.once = true;
              console.log(JSON.stringify(group.node().getBoundingClientRect()));
              console.log(JSON.stringify(group.select('.fd-text').node().getBoundingClientRect()))
            }
        });

        // Exit any old nodes.
        fd.node.exit().remove();
      },

      tick : function () {
        fd.link.attr('x1', function(d) { return d.source.x; })
               .attr('y1', function(d) { return d.source.y; })
               .attr('x2', function(d) { return d.target.x; })
               .attr('y2', function(d) { return d.target.y; });

        fd.node.attr("transform", function(d) {
          var dx = Math.max(30, Math.min(fd.width - 30, d.x)),
              dy = Math.max(30, Math.min(fd.height - 30, d.y));

          return 'translate(' + dx + ',' + dy + ')';
        });

      },

      flatten : function (root) {
        var nodes = [],
            i     = 0;

        function recurse (node) {
            if (node.values) {
              node.children = node.values;
              node.children.forEach(recurse);
            }
            if (!node.id) { node.id = ++ i; }

          nodes.push(node);
        }

        recurse(root);

        return nodes;
      },

      popDsp  : function (d) {
        var grp = d3.select(this)
                    .attr('id', function () { return 'grp-' + d.id; }),
            oy = 20, // popup offset y
            txt = '', // popup text
            popId = function () { return 'popup-' + d.spriteClass; },
            popup,
            closeBtn = document.querySelector('#fd-templates .fd-close-btn')
                               .cloneNode(true),
            tp;

        txt = '<p><strong><em><a href="http://html5devconf.com/' + d.spkrHref +'" target="_blank">' + d.speaker + '</a></em></strong></p>' +
              '<p><a href="http://html5devconf.com/' + d.sessHref +'" target="_blank">' + d.session + '</p>' +
              '<p>' + d.sessTime + '</p>' +
              '<p>' + d.room + '</p>';

        d3.select('.fd-svg-box')
          .append('div')
          .attr('class', 'fd-popup')
          .attr('id', popId())
          .style('top', function () {
              var fy = d.py - oy < 10 ? 10 : d.py - oy;
              return fy  + 'px';
          })
          .style('left', function () { return (d.px + 20) + 'px'; })
          .html(txt);

        popup = d3.select('#' + popId())
                  .transition()
                    .duration(300)
                    .style('opacity', .9);


        popup.node().insertBefore(closeBtn, popup.node().firstChild);
        tp = popup.node().querySelector('p');
        popup.node().style.width = (tp.clientWidth + 60) + 'px';

        closeBtn.addEventListener('click', function (evt) {
          var popup = this.parentElement;

          d3.select(popup)
            .transition()
              .duration(500)
              .style('opacity', 0)
              .style('cursor', 'default')
            .remove();
        });

        fd.popDrag(popup.node());
      },

      popDrag : function (el) {
        var dragger = d3.select(el),
            left    = parseInt(el.style.left, 10),
            top     = parseInt(el.style.top, 10);

        dragger.call(d3.behavior.drag()
               .on('dragstart', dragStr)
               .on('drag', dragging)
               .on('dragend', dragEnd)
        );

        function dragStr () {
            dragger.transition()
                   .duration(200)
                     .style('opacity', .6);
        }

        function dragging () {

            d3.event.sourceEvent.cancelBubble = true;

            left = parseInt(dragger.node().style.left, 10) + d3.event.dx;
            top = parseInt(dragger.node().style.top, 10) + d3.event.dy;

            dragger.node().style.top =  top + 'px';
            dragger.node().style.left = left + 'px';
        }

        function dragEnd () {

            d3.event.sourceEvent.cancelBubble = true;

            dragger.transition()
                   .duration(200)
                     .style('opacity', .9);
        }
      },

      sortByKeys : function (keys, dataSet) {
        // sort an array of objects on the desired keys
        // keys is an array of objects with the following properties
        //  [{ name    : the field's name,
        //     prepFx  : a function to prep the field value, e.g trim, parseInt, parseFloat
        //     reverse : sort order - true/false
        //  }]
        // if no prep function and sorting in default order,
        // you can just pass in the field's name as a string

        var kLen = keys.length;

        dataSet.sort(function(a, b) {
            var sA, sB, kx, field, key, prepFx, reverse, result;
            for (kx = 0; kx < kLen; kx += 1) {
              result = 0;
              field = keys[kx];

              key = typeof field === 'string' || field === 'number' ? field : field.name;

              sA = a[key];
              sB = b[key];

              if (typeof field.prepFx !== 'undefined') {
                sA = field.prepFx(sA);
                sB = field.prepFx(sB);
              }

              reverse = (field.reverse) ? -1 : 1;

              if (sA < sB) { result = reverse * -1; }
              if (sA > sB) { result = reverse * 1; }
              if (result !== 0) { break; }
            }
            return result;
        });
        return dataSet;
      },

      clone : function (src) {
        function mixin (dest, source, copyFunc) {
            var name, s, i, empty = {};
            for(name in source) {
              // the (!(name in empty) || empty[name] !== s) condition avoids copying properties in 'source'
              // inherited from Object.prototype.   For example, if dest has a custom toString() method,
              // don't overwrite it with the toString() method that source inherited from Object.prototype
              s = source[name];
              if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                dest[name] = copyFunc ? copyFunc(s) : s;
              }
            }
            return dest;
        }

        if(!src || typeof src != 'object' || Object.prototype.toString.call(src) === '[object Function]') {
          // null, undefined, any non-object, or function
          return src;  // anything
        }
        if(src.nodeType && 'cloneNode' in src) {
          // DOM Node
          return src.cloneNode(true); // Node
        }
        if(src instanceof Date) {
          // Date
          return new Date(src.getTime());  // Date
        }
        if(src instanceof RegExp) {
          // RegExp
          return new RegExp(src);   // RegExp
        }
        var r, i, l;
        if(src instanceof Array) {
          // array
          r = [];
          i = 0;
          l = src.length;
          for(i; i < l; ++i) {
              if(i in src) {
                  r.push(fd.clone(src[i]));
              }
          }
          // we don't clone functions for performance reasons
          //    }else if(d.isFunction(src)) {
          //      // function
          //      r = function() { return src.apply(this, arguments); };
        } else {
          // generic objects
          r = src.constructor ? new src.constructor() : {};
        }
        return mixin(r, src, fd.clone);

      }, //end clone

      padZ  : function (num, z) {
        // returns left-zero-padded string from an int or float
        var padded = num + '',
            len    = z || 2;

        if (padded.length < len) {
          while (padded.length < len) {
            padded = '0' + padded;
          }
        }
        return padded;
      },

      trimArrObj: function (src, props) {
        var sx = 0,
            sLen = src.length;

        for(sx; sx < sLen; sx += 1) {
          src[sx] = fd.trimObj(src[sx], props);
        }
        return src;
      },

      trimObj : function (src, props) {
        var rtnObj = {},
            px = 0,
            pLen = props.length;
        for(px; px < pLen; px += 1) {
          rtnObj[props[px]] = src[props[px]];
        }
        return rtnObj;
      },

      debounce  : function(func, wait, immediate) {
        // func : function to call
        // wait : interval to wait
        // immediate: boolean
        var timeout;
        return function() {
          var context = this,
              args = arguments,
              later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
              },
          callNow = immediate && !timeout;

          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) { func.apply(context, args); }
        };
      },

      offsets : {
        adnan_wahab : [ -120, -0 ],
        adrian_roselli : [ -240, -0 ],
        alex_russell : [ -360, -0 ],
        anthony_phillips : [ -480, -0 ],
        ari_lerner : [ -600, -0 ],
        arin_sime : [ -720, -0 ],
        ash_blue : [ -840, -0 ],
        ben_farrell : [ -960, -0 ],
        benjamin_farrell : [ -1080, -0 ],
        benoit_marchant : [ -1200, -0 ],
        bianca_gandolfo : [ -1320, -0 ],
        brad_westfall : [ -1440, -0 ],
        christian_heilmann : [ -1560, -0 ],
        conrad_irwin : [ -1680, -0 ],
        dan_lynch : [ -1800, -0 ],
        daniel_austin : [ -1920, -0 ],
        dave_arel : [ -0, -120 ],
        david_alfaro : [ -120, -120 ],
        david_fetterman : [ -240, -120 ],
        david_greenspan : [ -360, -120 ],
        demian_borba : [ -480, -120 ],
        don_olmstead : [ -600, -120 ],
        doris_chen : [ -720, -120 ],
        "erin_swenson-healey" : [ -840, -120 ],
        frank_greco : [ -960, -120 ],
        frederick_tubiermont : [ -1080, -120 ],
        ian_jacobs : [ -1200, -120 ],
        ilya_grigorik : [ -1320, -120 ],
        jafar_husain : [ -1440, -120 ],
        jason_aden : [ -1560, -120 ],
        jeff_jenkins : [ -1680, -120 ],
        jen_kramer : [ -1800, -120 ],
        jeremy_wilken : [ -1920, -120 ],
        joe_marini : [ -0, -240 ],
        johnny_halife : [ -120, -240 ],
        jonathan_smiley : [ -240, -240 ],
        jonnie_spratley : [ -360, -240 ],
        julian_bucknall : [ -480, -240 ],
        kevin_nilson : [ -600, -240 ],
        kik : [ -840, -240 ],
        kianosh_pourian : [ -720, -240 ],
        kyle_simpson : [ -960, -240 ],
        lisa_deluca : [ -1080, -240 ],
        liz_lee : [ -1200, -240 ],
        marc_grabanski : [ -1320, -240 ],
        mark_lassoff : [ -1440, -240 ],
        mark_stuart : [ -1560, -240 ],
        masa_tanaka : [ -1680, -240 ],
        mat_groves : [ -1800, -240 ],
        mathew_groves : [ -1920, -240 ],
        mehul_harry : [ -0, -360 ],
        michael_anthony : [ -120, -360 ],
        michael_dailly : [ -240, -360 ],
        michael_jackson : [ -360, -360 ],
        mike_acton : [ -480, -360 ],
        nick_desaulniers : [ -600, -360 ],
        parashuram_narasimhan : [ -720, -360 ],
        parris_khachi : [ -840, -360 ],
        paul_fischer : [ -960, -360 ],
        "peter-paul_koch" : [ -1080, -360 ],
        peter_jensen : [ -1200, -360 ],
        ray_villalobos : [ -1320, -360 ],
        reinaldo_ferraz : [ -1440, -360 ],
        richard_clark : [ -1560, -360 ],
        rob_dodson : [ -1680, -360 ],
        rodrigo_fernandez : [ -1800, -360 ],
        ross_gerbasi : [ -1920, -360 ],
        ross_mckegney : [ -0, -480 ],
        ryan_anklam : [ -120, -480 ],
        sirar_salih : [ -240, -480 ],
        steve_newcomb : [ -360, -480 ],
        steve_souders : [ -480, -480 ],
        tom_coleman : [ -600, -480 ],
        tom_wiltzius : [ -720, -480 ],
        tony_parisi : [ -840, -480 ],
        tony_phillips : [ -960, -480 ],
        tyler_benziger : [ -1080, -480 ],
        volkan_ozcelik : [ -1200, -480 ],
        wayne_carter : [ -1560, -480 ],
        xavier_damman : [ -1320, -480 ],
        yurii_luchaninov : [ -1440, -480 ]
      }
    };
    return fd;
  }()); // end fd iife

  // kick the whole thing off
  d3.json('data/sessions.json', h5dc.fd.init);

}());

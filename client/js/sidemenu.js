var SideMenu = (function(root, viewer) {
    var width = 200;
    var animeTime = 250;
    var self = this;

    //--------------------------------------------------------

    this.actChangeLock = function() {
        var flag = !viewer.getDragLock();
        viewer.setDragLock(flag);
        this.value = flag ? 'lock' : 'unlock';
        viewer.setTextSelectable(!flag);
    };

    this.actEditSelectedNode = function() {
        var view = viewer.getSelectedNode();
        if (view != null) {
            DNodeEditWindow.open(view.node, view.node, function(node) {
                viewer.setModel(viewer.model);
                var r = DCaseAPI.update({
                    argument_id: viewer.opts.argument_id,
                    node_id: node.id,
                    description: node.text
                });
            });
        }
    };

    this.actInsertToSelectedNode = function() {
        console.log(viewer.tmp_id);
        var view = viewer.getSelectedNode();
        if (view != null) {
            DNodeEditWindow.open(null, view.node, function(newNode) {
                view.node.addChild(newNode);
                viewer.setModel(viewer.model);
                DCaseAPI.insert({
                        NodeType: newNode.type,
                        ThisNodeId: viewer.tmp_id,
                        Description: newNode.text,
                        BelongedArgumentId: viewer.opts.argument_id,
                        ParentNodeId: view.node.id,
                        Children: []
                });
            });
            viewer.tmp_id -= 1;
        }
    };

    this.actRemoveSelectedNode = function() {
        var view = viewer.getSelectedNode();
        if (view != null) {
            if (confirm('ノードを削除しますか？')) {
                var parent = view.node.parents;
                if (parent.length > 0) {
                    parent[0].removeChild(view.node);
                    viewer.setModel(viewer.model);
                    DCaseAPI.del({
                        BelongedArgumentId: viewer.opts.argument_id,
                        NodeId: view.node.id
                    });
                }
            }
        }
    };

    function ExportTree(DumpType, NodeId) {
        var url = CONFIG.view_cgi + '?' + NodeId + '.' + DumpType;
        window.open(url, '_blank');
    }

    function GetArgumentId(viewer) {
        /*FIXME(ide) get subtree's argument id*/
        return viewer.opts.argument_id;
    }

    this.actExportJson = function() {
        ExportTree('json', GetArgumentId(viewer));
    };

    this.actExportPng = function() {
        ExportTree(/*FIXME(ide)*/'dot', GetArgumentId(viewer));
    };

    this.actExportDScript = function() {
        ExportTree('dscript', GetArgumentId(viewer));
    };

    this.actCommit = function() {
        var msg = prompt('コミットメッセージを入力して下さい');
        if (msg != null) {
            console.log(viewer.model);
            DCaseAPI.commit(msg, viewer.opts.argument_id);
        }
    };

    this.show = function(m) {
        var ids = [
            '#menu-search',
            '#menu-export',
            '#menu-create',
            '#menu-tool',
            '#menu-color'
        ];
        $.each(ids, function(i, id) {
            if (m == id) $(id).toggle();
            else $(id).hide();
        });
    };

    //--------------------------------------------------------
    var $search = $('#menu-search-i')
            .click(function(e) {
                self.show('#menu-search');
                $('#menu-search input').focus();
            })
            .appendTo(root);

    $('#menu-search input').keydown(function(e) {
        if (e.keyCode == 13) { // Enter key
            if (this.value == "") return;
            var i = this;
            var r = DCaseAPI.search({
                SearchText: i.value
            });
            self.showSearchResult(r);
        }
    });

    this.showSearchResult = function(result) {
        var $field = $('#menu-search ul');
        var $icon = $('#menu-search .input-append i');
        $icon.hide();
        $('#menu-search .input-append i').hide();
        var spin = new DCaseSpinner($('#menu-search .input-append'));
        spin.start({top: -14, left: 15});
        $field.addClass('unstyled');
        $field.empty();
        for (var i = 0; i < result.NodeIdList.length; i++) {
            var r = DCaseAPI.call('getNode', {NodeId: result.NodeIdList[i]});
            // vvv FIXME it is adhock
            var res1 = DCaseAPI.call("getNodeTree", {
                BelongedArgumentId: r.Node.BelongedArgumentId
            });
            try {
                var node = createNodeFromJson(res1);
                showResult($field, r);
            } catch(e) {
                console.log(e + ': ' + r.Node.Description);
            }
            finally {
            }
            // ^^^ FIXME it is adhock

        }
        function showResult($field, result) {
            $('<li>' + result.Node.Description + '</li>')
                .addClass('sidemenu-result')
                .click(function() {
                    initViewer(result.Node.BelongedArgumentId);
                    //viewer.centerize(v, 500);
                })
                .appendTo($field);
        };
        spin.stop();
        $icon.show();
        if ($field.children().length <= 0) {
            $('<li>一致するノードが見つかりませんでした</li>').appendTo($field);
        }
    };
    //--------------------------------------------------------
    var $export = $('#menu-export-i')
            .click(function(e) {
                self.show('#menu-export');
            })
            .appendTo(root);

    $('#menu-export-json').click(function() {
        self.actExportJson();
    });

    $('#menu-export-png').click(function() {
        self.actExportPng();
    });

    $('#menu-export-dscript').click(function() {
        self.actExportDScript();
    });


    //--------------------------------------------------------
    var $create = $('#menu-create-i')
            .click(function(e) {
                self.show('#menu-create');
            })
            .appendTo(root);
    $('#menu-create-argument').click(function(e) {
        // create new Argument
        var cmtr = $('#argument_committer').val();
        var desc = $('#argument_description').val();
        var r = DCaseAPI.call('CreateTopGoal',
            {
                'Committer': cmtr,
                'ProcessType': 1,
                'Description': desc,
                'Justification': 'first commit'
            });
        initViewer(r.BelongedArgumentId);
    });

    //--------------------------------------------------------
    var $tool = $('#menu-tool-i')
            .click(function(e) {
                self.show('#menu-tool');
            })
            .appendTo(root);

    $('#menu-tool-commit').click(function() {
        self.actCommit();
    });

    //--------------------------------------------------------
    var $color = $('#menu-color-i').click(function() {
        self.show('#menu-color');
    }).appendTo(root);
    $('input.colorpicker').colorPicker().change(function() {
        viewer.updateNodeColor($(this).attr('name'), $(this).val());
    });
    $('#theme-option').change(function() {
        var arr = $(this).find('option:selected').val().split(',');
        $('#colorset input').each(function(i) {
            $(this).val('#' + arr[i]);
            $(this).change();
        });
    });
});

var DCaseSpinner = (function($target) {
    this.$target = $target;
    this.spinner;
    this.start = function(opts) {
        var _opts = {
            lines: 13, // The number of lines to draw
            length: 4, // The length of each line
            width: 2, // The line thickness
            radius: 4, // The radius of the inner circle
            rotate: 0, // The rotation offset
            color: '#000', // #rgb or #rrggbb
            speed: 0.9, // Rounds per second
            trail: 69, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        };
        if (this.$target.children('.spinner').length == 0) {
            this.spinner = new Spinner(_opts).spin();
            this.$target.append(this.spinner.el);
            if (opts != undefined) {
                for (i in opts) {
                    this.$target.children('.spinner').css(opts);
                }
            }
        }
    }
    this.stop = function() {
        this.spinner.stop();
    }
});


# -*- Makefile -*-
# ----------------------------------------------------------------------

# override in command line
PREFIX = /tmp

# ----------------------------------------------------------------------

MAKEFLAGS = -w

AMV = $(AMV_LIB) $(AMV_TEST)

AMV_TEST = amv-config.js test-3d.ts test.less test-3d.json test-2d.ts test-3d.html #test-2d.html
AMV_LIB = acmacs-plot-data.ts amv-level1.ts amv-level2.ts \
	  amv-manipulator.ts amv-manipulator-2d.ts amv-manipulator-3d.ts amv-2d.ts amv-3d.ts \
	  amv-utils.ts acmacs-toolkit.ts amv-state.ts
AMV_LESS = acmacs-toolkit.less amv.less
AMV_TYPINGS = antigenic-map-viewer.d.ts
AMV_FONTS = fonts/helvetiker_regular.typeface.js fonts/helvetiker_bold.typeface.js

# LIB_JS = jquery jquery.mousewheel jquery-ui require three css json
# LIB_TYPINGS = jquery jqueryui require three

LIB_JS = jquery threejs require

# ----------------------------------------------------------------------

TARGET_JS = $(TS_TO_JS) $(patsubst %.js,$(DIST)/%.js,$(filter %.js,$(AMV))) $(patsubst %.json,$(DIST)/%.json,$(filter %.json,$(AMV))) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))
  # $(patsubst %,$(DIST)/%.js,$(LIB_JS))
TARGET_CSS = $(patsubst %.less,$(DIST)/%.css,$(filter %.less,$(AMV)))
TARGET_HTML = $(patsubst %,$(DIST)/%,$(filter %.html,$(AMV)))

# BUILD_TYPINGS = $(patsubst %,$(BUILD)/%.d.ts,$(LIB_TYPINGS)) $(AMV_TYPINGS)

# ----------------------------------------------------------------------

BUILD = build
DIST = dist

all: ${TARGET_JS} $(TARGET_CSS) $(TARGET_HTML)
	@echo rebuilt $?
	@echo all $^

# ----------------------------------------------------------------------

EUPA_ROOT = $(BUILD)
EUPA_JS = $(DIST)

include Makefile.eupa

# TYPINGS = $(EUPA_DTS)

# ----------------------------------------------------------------------

TS_TO_JS = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV)))

INSTALL_FILES = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV_LIB))) $(AMV_LESS) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))

VERSION = $(shell cat VERSION.txt)
PKG_CONFIG_PATH = $(firstword $(subst :, ,$(shell pkg-config --variable pc_path pkg-config)))

# ----------------------------------------------------------------------

test: all
ifeq ($(shell uname -s),Darwin)
	open $(TARGET_HTML)
endif

install: all
	/usr/bin/install -d -m 0755 $(PREFIX)/share/antigenic-map-viewer
	/usr/bin/install -pv -m 0644 $(INSTALL_FILES) $(PREFIX)/share/antigenic-map-viewer
	/usr/bin/install -d -m 0755 $(PREFIX)/share/antigenic-map-viewer/typings
	/usr/bin/install -pv -m 0644 $(AMV_TYPINGS) $(PREFIX)/share/antigenic-map-viewer/typings
	/usr/bin/awk "{ sub(/%PREFIX%/, \"$(PREFIX)\"); sub(/%VERSION%/, \"$(VERSION)\"); print }" antigenic-map-viewer.pc >$(PKG_CONFIG_PATH)/antigenic-map-viewer.pc

clean:
	rm -rf $(DIST)

distclean: clean
	rm -rf $(BUILD)

# ----------------------------------------------------------------------

RELPATH = $(shell python -c "import os, sys; sys.stdout.write(os.path.relpath('${1}', '${2}'))")

# $(BUILD):
#	mkdir -p $@

# $(DIST):
#	mkdir -p $@

# ----------------------------------------------------------------------

# $(DIST)/jquery.js: | $(BUILD) $(DIST)
#	cd $(BUILD) && bower install jquery
#	/usr/bin/awk '/ sourceMappingURL=/ {} !/ sourceMappingURL=/ {print}' build/bower_components/jquery/dist/jquery.min.js >$@

# $(BUILD)/jquery.d.ts: | $(BUILD)
#	cd $(BUILD) && tsd query jquery --action install
#	ln -sf $(call RELPATH,$(BUILD)/typings/jquery,$(dir $@))/jquery.d.ts $@

# $(DIST)/jquery.mousewheel.js: | $(BUILD) $(DIST) $(DIST)/jquery.js
#	cd $(BUILD) && bower install jquery-mousewheel
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/jquery-mousewheel,$(dir $@))/jquery.mousewheel.min.js $@

# $(DIST)/jquery-ui.js: | $(BUILD) $(DIST) $(DIST)/jquery.js
#	cd $(BUILD) && bower install jquery-ui
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/jquery-ui,$(dir $@))/jquery-ui.min.js $@
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/jquery-ui/themes/smoothness,$(dir $@))/jquery-ui.min.css $(dir $@)jquery-ui.css
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/jquery-ui/themes/smoothness,$(dir $@))/images $(dir $@)images

# $(BUILD)/jqueryui.d.ts: | $(BUILD)
#	cd $(BUILD) && tsd query jqueryui --action install
#	/usr/bin/awk 'BEGIN {RS="";} { gsub( "\\.\\./jquery/jquery\\.d\\.ts", "jquery.d.ts"); print; }' $(BUILD)/typings/jqueryui/jqueryui.d.ts >$@

# $(DIST)/require.js: | $(BUILD) $(DIST)
#	cd $(BUILD) && bower install requirejs
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/requirejs,$(dir $@))/require.js $@

# $(BUILD)/require.d.ts: | $(BUILD)
#	cd $(BUILD) && tsd query require --action install
#	ln -sf $(call RELPATH,$(BUILD)/typings/requirejs,$(dir $@))/require.d.ts $@

# $(DIST)/three.js: | $(BUILD) $(DIST)
#	cd $(BUILD) && bower install threejs
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/three.js/build,$(dir $@))/three.min.js $@

# $(BUILD)/three.d.ts: | $(BUILD)
#	cd $(BUILD) && tsd query three --action install
#	/usr/bin/awk 'BEGIN {RS="";} { gsub( "///<reference path", "/// reference path"); gsub(/export class Audio(Listener)?[^}]+}/, "/* & */"); print; }' $(BUILD)/typings/threejs/three.d.ts >$@

# $(DIST)/css.js: | $(BUILD) $(DIST) $(DIST)/require.js
#	cd $(BUILD) && curl -sLO 'https://raw.github.com/dimaxweb/CSSLoader/master/dist/css.js'
#	ln -sf $(call RELPATH,$(BUILD),$(dir $@))/css.js $@

# $(DIST)/json.js: | $(BUILD) $(DIST) $(DIST)/require.js
#	cd $(BUILD) && bower install requirejs-plugins
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/requirejs-plugins/lib,$(dir $@))/text.js $(dir $@)text.js
#	ln -sf $(call RELPATH,$(BUILD)/bower_components/requirejs-plugins/src,$(dir $@))/json.js $@

# ----------------------------------------------------------------------

# $(TS_TO_JS): $(DIST)/%.js: %.ts | $(TSC) $(DIST) $(LIB_JS)
$(DIST)/%.js: %.ts | $(TSC) $(DIST) $(LIB_JS)
	$(TSC) --outDir $(DIST) --removeComments -m amd -t ES5 --noEmitOnError --noImplicitAny $<

$(DIST)/%.js: %.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.js: fonts/%.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

$(DIST)/%.json: %.json | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.css: %.less $(AMV_LESS) | $(DIST) $(LESSC)
	$(LESSC) $< $@

# $(DIST)/%.min.map: build/js/%.min.map
#	@mkdir -p $(dir $@)
#	ln -s ../$^ $@

# Have to copy html to dist, Firefox does not like symbolic links
$(DIST)/%.html: %.html | $(DIST)
	cp $^ $@

# ----------------------------------------------------------------------

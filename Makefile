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

LIB_JS = jquery jquery-ui threejs require

# ----------------------------------------------------------------------

TARGET_JS = $(TS_TO_JS) $(patsubst %.js,$(DIST)/%.js,$(filter %.js,$(AMV))) $(patsubst %.json,$(DIST)/%.json,$(filter %.json,$(AMV))) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))
  # $(patsubst %,$(DIST)/%.js,$(LIB_JS))
TARGET_CSS = $(patsubst %.less,$(DIST)/%.css,$(filter %.less,$(AMV)))
TARGET_HTML = $(patsubst %,$(DIST)/%,$(filter %.html,$(AMV)))

# BUILD_TYPINGS = $(patsubst %,$(BUILD)/%.d.ts,$(LIB_TYPINGS)) $(AMV_TYPINGS)

# ----------------------------------------------------------------------

TS_TO_JS = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV)))

INSTALL_FILES = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV_LIB))) $(AMV_LESS) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))

VERSION = $(shell cat VERSION.txt)
PKG_CONFIG_PATH = $(firstword $(subst :, ,$(shell pkg-config --variable pc_path pkg-config)))

# ----------------------------------------------------------------------

BUILD = build
DIST = dist

all: $(TARGET_JS) $(TARGET_CSS) $(TARGET_HTML)
	@#echo 'rebuilt  ' $?
	@#echo 'all      ' $^
	@#echo 'TARGET_JS' $(TARGET_JS)

# ----------------------------------------------------------------------

EUPA_ROOT = $(BUILD)
EUPA_JS = $(DIST)

ifeq ($(findstring clean,$(MAKECMDGOALS)),)
ifeq ($(wildcard eupa/Makefile.eupa),)
  $(shell git clone https://github.com/skepner/eupa.git)
endif
-include eupa/Makefile.eupa
endif

# TYPINGS = $(EUPA_DTS)

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
	rm -rf $(BUILD) eupa

# ----------------------------------------------------------------------

RELPATH = $(shell python -c "import os, sys; sys.stdout.write(os.path.relpath('${1}', '${2}'))")

# ----------------------------------------------------------------------

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

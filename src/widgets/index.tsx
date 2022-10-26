import { declareIndexPlugin, ReactRNPlugin, Rem, RemType, } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import {presentationCode, } from '../lib/constants';
import {presentationCSS} from '../lib/css';

let presentationRem: Rem | null = null
let slideIdx = 0;

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerPowerup(
    "Presentation",
    presentationCode,
    "Create presentations directly within RemNote",
    {
      slots: []
    }
  );

  await plugin.app.registerCommand({
    id: "presentation",
    name: "Presentation",
    description: "Use this command to tag the focused Rem as a presentation.",
    action: async () => {
      const rem = await plugin.focus.getFocusedRem();
      await rem?.addPowerup(presentationCode);
    }
  })

  const getVisibleChildren = async (rem: Rem, portalId: string) => {
    const fstChild = await plugin.rem.findOne(rem?.children[0])
    const visibleChildren = await fstChild?.visibleSiblingRem(portalId);
    return visibleChildren || []
  }

  const getSlides = async () => {
    return getVisibleChildren(presentationRem!, presentationRem!._id);
  }

  const getSlideByIndex = async (idx: number) => {
    const slides = await getSlides()
    if (idx < 0 || idx > slides.length - 1) {
      return;
    }
    const slide = slides[idx]
    return slide
  }

  const loadSlide = async (direction: 1 | -1 | 0) => {
    const nextIdx = slideIdx + direction
    const slideOrPortal = await getSlideByIndex(nextIdx)
    if (!slideOrPortal) {
      return
    }
    else {
      slideIdx = nextIdx
      if (await slideOrPortal.getType() !== RemType.PORTAL) {
        await slideOrPortal.openRemAsPage();
      }
      else {
        const children = await slideOrPortal.allRemInDocumentOrPortal();
        const fstChild = children[0]
        await Promise.all((await fstChild.getChildrenRem()).map(x => x.collapse(fstChild._id)))
        await fstChild?.openRemAsPage();
      }
    }
  }

  const startPresentation = async (rem: Rem) => {
    await plugin.app.registerCSS(presentationCode, presentationCSS)
    presentationRem = rem;
    await loadSlide(0)
  }

  const stopPresentation = async () => {
    slideIdx = 0
    await plugin.app.registerCSS(presentationCode, '')
    await presentationRem?.openRemAsPage();
    presentationRem = null;
  }

  await plugin.app.registerCommand({
    id: "next-slide",
    name: "Next Slide",
    description: "Load the next slide",
    keyboardShortcut: "mod+shift+.",
    action: async () => {
      const isPresenting = presentationRem != null;
      if (isPresenting) {
        loadSlide(1)
      }
    }
  })

  await plugin.app.registerCommand({
    id: "prev-slide",
    name: "Previous Slide",
    description: "Load the previous slide",
    keyboardShortcut: "mod+shift+,",
    action: async () => {
      const isPresenting = presentationRem != null;
      if (isPresenting) {
        loadSlide(-1)
      }
    }
  })

  await plugin.app.registerCommand({
    id: "start-presentation",
    name: "Start Presentation",
    action: async () => {
      const rem = await plugin.focus.getFocusedRem();
      const isPresenting = presentationRem != null;
      if (!rem || !await rem?.hasPowerup(presentationCode)) {
        await plugin.app.toast("Focused Rem isn't a presentation (did you tag with the presentation powerup?)")
      }
      else if (isPresenting) {
        await plugin.app.toast("Already presenting!")
      }
      else {
        startPresentation(rem)
      }
    }
  })

  await plugin.app.registerCommand({
    id: "stop-presentation",
    name: "Stop Presentation",
    action: async () => {
      stopPresentation()
    }
  })
  
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);

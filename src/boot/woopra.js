import { boot } from 'quasar/wrappers'
import { auth0 } from './auth0'

// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app, router }) => {
  (function(){
    var t,i,e,n=window,o=document,a=arguments,s="script",r=["config","track","identify","visit","push","call","trackForm","trackClick"],c=function(){var t,i=this;for(i._e=[],t=0;r.length>t;t++)(function(t){i[t]=function(){return i._e.push([t].concat(Array.prototype.slice.call(arguments,0))),i}})(r[t])};for(n._w=n._w||{},t=0;a.length>t;t++)n._w[a[t]]=n[a[t]]=n[a[t]]||new c;i=o.createElement(s),i.async=1,i.src="//static.woopra.com/js/w.js",e=o.getElementsByTagName(s)[0],e.parentNode.insertBefore(i,e)
  })("woopra");

  woopra.config({
    domain: 'pennyvault.com'
  });

  woopra.isUserSet = false

  router.afterEach((to) => {
    if (auth0.user.value !== undefined) {
      woopra.identify({
        email: auth0.user.value.email,
        name: auth0.user.value.name
      })
    }
    woopra.track("pv", {
      url: to.path,
      title: to.path
    })
  })
})

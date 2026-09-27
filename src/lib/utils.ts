import { createCn } from 'cn/config'

// Registers the custom font-size scale from globals.css so `text-ui` and a
// color such as `text-muted-foreground` are not merged as the same group.
export const cn = createCn({
  extend: {
    theme: {
      text: ['3xs', '2xs', 'caption', 'meta', 'small', 'ui', 'body', 'title', 'mid', 'h2', 'stat', 'big', 'display', 'h1'],
    },
  },
})

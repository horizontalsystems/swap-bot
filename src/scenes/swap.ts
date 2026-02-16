import { Markup, Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import { FEATURED_IDENTIFIERS } from '../config/assets'
import { getAssetByIdentifier, getAssets, getProvidersForPair } from '../db/database'
import { Asset, SwapContext } from '../types/context'
import { fetchQuote } from '../utils/api'

const CANCEL_TEXT = '\n\nType /cancel to cancel the swap at any time.'

const cancelButtonRow = [Markup.button.callback('❌ Cancel Swap', 'cancel_swap')]

function assetKeyboard(assets: Asset[], excludeIdentifier?: string) {
  const filtered = excludeIdentifier ? assets.filter(a => a.identifier !== excludeIdentifier) : assets

  const buttons = filtered.map(a => Markup.button.callback(a.identifier, `select_${a.identifier}`))

  const rows: ReturnType<typeof Markup.button.callback>[][] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }

  rows.push(cancelButtonRow)
  return Markup.inlineKeyboard(rows)
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatFees(fees: { type: string; asset: string; amount: string }[]): string {
  return fees.map(f => `  • ${f.type}: ${f.amount} ${f.asset}`).join('\n')
}

async function cancelAndLeave(ctx: SwapContext) {
  await ctx.answerCbQuery('Swap cancelled')
  await ctx.editMessageText('❌ Swap cancelled.')
  return ctx.scene.leave()
}

const swapWizard = new Scenes.WizardScene<SwapContext>(
  'swap-wizard',

  // Step 0: Select assetIn
  async ctx => {
    ctx.scene.session.assetIn = undefined
    ctx.scene.session.assetOut = undefined
    ctx.scene.session.amount = undefined
    ctx.scene.session.destinationAddress = undefined
    ctx.scene.session.refundAddress = undefined
    ctx.scene.session.routes = undefined
    ctx.scene.session.quote = undefined

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    if (featuredAssets.length === 0) {
      await ctx.reply('⚠️ No assets available yet. Token lists may still be loading. Please try again later.')
      return ctx.scene.leave()
    }

    await ctx.reply('🔄 *Swap — Step 1/5*\n\nSelect the asset you want to *send*:' + CANCEL_TEXT, {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets)
    })

    return ctx.wizard.next()
  },

  // Step 1: Waiting for assetIn callback
  async ctx => {
    if ('message' in (ctx.update as any)) {
      await ctx.reply('⚠️ Please select an asset from the buttons above.')
    }
  },

  // Step 2: Waiting for assetOut callback
  async ctx => {
    if ('message' in (ctx.update as any)) {
      await ctx.reply('⚠️ Please select an asset from the buttons above.')
    }
  },

  // Step 3: Handle amount input
  async ctx => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('⚠️ Please enter a valid number.')
      return
    }

    const amount = parseFloat(ctx.message.text)

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Please enter a valid positive number.')
      return
    }

    ctx.scene.session.amount = amount

    await ctx.reply(
      `📍 *Swap — Step 4/5*\n\nEnter your *${ctx.scene.session.assetOut!.name}* destination address\n(where you want to receive funds):` +
        CANCEL_TEXT,
      { parse_mode: 'Markdown' }
    )

    return ctx.wizard.next()
  },

  // Step 4: Handle destination address, ask for refund address
  async ctx => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('⚠️ Please enter a valid wallet address.')
      return
    }

    const address = ctx.message.text.trim()

    if (address.length < 10) {
      await ctx.reply("⚠️ That doesn't look like a valid address. Please try again.")
      return
    }

    ctx.scene.session.destinationAddress = address

    await ctx.reply(
      `🔙 *Swap — Step 5/5*\n\nEnter your *${ctx.scene.session.assetIn!.name}* refund address\n(in case the swap fails, funds will be returned here):` +
        CANCEL_TEXT,
      { parse_mode: 'Markdown' }
    )

    return ctx.wizard.next()
  },

  // Step 5: Handle refund address, fetch dry quotes, show route options
  async ctx => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('⚠️ Please enter a valid wallet address.')
      return
    }

    const refundAddress = ctx.message.text.trim()

    if (refundAddress.length < 10) {
      await ctx.reply("⚠️ That doesn't look like a valid address. Please try again.")
      return
    }

    ctx.scene.session.refundAddress = refundAddress

    const { assetIn, assetOut, amount, destinationAddress } = ctx.scene.session

    const providers = getProvidersForPair(assetIn!.identifier, assetOut!.identifier)

    if (providers.length === 0) {
      await ctx.reply(
        `❌ No providers support swapping *${assetIn!.name}* → *${assetOut!.name}*.\n\nPlease try a different pair or /cancel.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    const loadingMsg = await ctx.reply('⏳ Fetching quotes...')

    try {
      const quoteResponse = await fetchQuote({
        sellAsset: assetIn!.identifier,
        buyAsset: assetOut!.identifier,
        sellAmount: amount!.toString(),
        destinationAddress: destinationAddress!,
        providers,
        dry: true
      })

      if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
        await ctx.reply('❌ No swap routes available for this pair. Please try a different combination.', {
          ...Markup.inlineKeyboard([cancelButtonRow])
        })
        return
      }

      ctx.scene.session.routes = quoteResponse.routes

      try {
        await ctx.deleteMessage(loadingMsg.message_id)
      } catch {
        // Ignore
      }

      const routeLines = quoteResponse.routes.map((route, i) => {
        const provider = route.providers.join(', ')
        const time = formatTime(route.estimatedTime.total)
        return `*${i + 1}.* *${provider}*\n   Receive: ~${route.expectedBuyAmount} ${assetOut!.name} (min ${route.expectedBuyAmountMaxSlippage})\n   Time: ~${time}`
      })

      const routeButtons = quoteResponse.routes.map((route, i) =>
        Markup.button.callback(`${i + 1}. ${route.providers.join(', ')}`, `route_${i}`)
      )

      const buttonRows = routeButtons.map(b => [b])
      buttonRows.push(cancelButtonRow)

      await ctx.reply(
        `📊 *Available Quotes*\n\n` +
          `*${amount} ${assetIn!.name}* → *${assetOut!.name}*\n\n` +
          routeLines.join('\n\n') +
          `\n\nSelect a provider:`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttonRows)
        }
      )

      return ctx.wizard.next()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Swap] Quote error:', error)
      await ctx.reply(`❌ Failed to fetch quote: ${errMsg}\n\nPlease try again or /cancel.`)
      return
    }
  },

  // Step 6: Waiting for route selection
  async ctx => {
    if ('message' in (ctx.update as any)) {
      await ctx.reply('⚠️ Please select a provider from the buttons above.')
    }
  },

  // Step 7: Waiting for confirm/cancel
  async ctx => {
    if ('message' in (ctx.update as any)) {
      await ctx.reply('⚠️ Please use the buttons to confirm or cancel.')
    }
  }
)

// --- Handle /cancel text command inside the wizard ---
swapWizard.command('cancel', async ctx => {
  await ctx.reply('❌ Swap cancelled.')
  return ctx.scene.leave()
})

// --- Actions ---

// AssetIn / AssetOut selection
swapWizard.action(/^select_(.+)$/, async ctx => {
  if (ctx.wizard.cursor === 1) {
    const identifier = ctx.match[1]
    const asset = getAssetByIdentifier(identifier)

    if (!asset) {
      await ctx.answerCbQuery('Asset not found')
      return
    }

    ctx.scene.session.assetIn = asset
    await ctx.answerCbQuery(`Selected ${asset.name}`)
    await ctx.editMessageText(`✅ Sending: *${asset.name}*`, {
      parse_mode: 'Markdown'
    })

    const featuredAssets = getAssets(FEATURED_IDENTIFIERS)

    await ctx.reply('🔄 *Swap — Step 2/5*\n\nSelect the asset you want to *receive*:' + CANCEL_TEXT, {
      parse_mode: 'Markdown',
      ...assetKeyboard(featuredAssets, asset.identifier)
    })

    return ctx.wizard.next()
  }

  if (ctx.wizard.cursor === 2) {
    const identifier = ctx.match[1]
    const asset = getAssetByIdentifier(identifier)

    if (!asset) {
      await ctx.answerCbQuery('Asset not found')
      return
    }

    ctx.scene.session.assetOut = asset
    await ctx.answerCbQuery(`Selected ${asset.name}`)
    await ctx.editMessageText(`✅ Receiving: *${asset.name}*`, {
      parse_mode: 'Markdown'
    })

    await ctx.reply(
      `💰 *Swap — Step 3/5*\n\nEnter the amount of *${ctx.scene.session.assetIn!.name}* you want to swap:` +
        CANCEL_TEXT,
      { parse_mode: 'Markdown' }
    )

    return ctx.wizard.next()
  }
})

// Route selection
swapWizard.action(/^route_(\d+)$/, async ctx => {
  const index = parseInt(ctx.match[1], 10)
  const { routes, assetIn, assetOut, amount, destinationAddress, refundAddress } = ctx.scene.session

  if (!routes || !routes[index] || !assetIn || !assetOut || !amount || !destinationAddress || !refundAddress) {
    await ctx.answerCbQuery('Session expired. Please start again with /swap.')
    return ctx.scene.leave()
  }

  const route = routes[index]
  ctx.scene.session.quote = route

  await ctx.answerCbQuery(`Selected ${route.providers.join(', ')}`)

  const estimatedTime = formatTime(route.estimatedTime.total)
  const fees = formatFees(route.fees)

  await ctx.editMessageText(
    `📋 *Swap Summary*\n\n` +
      `*Send:* ${amount} ${assetIn.name}\n` +
      `*Receive:* ~${route.expectedBuyAmount} ${assetOut.name}\n` +
      `*Min receive:* ${route.expectedBuyAmountMaxSlippage} ${assetOut.name}\n\n` +
      `*Destination:*\n\`${destinationAddress}\`\n` +
      `*Refund address:*\n\`${refundAddress}\`\n\n` +
      `*Provider:* ${route.providers.join(', ')}\n` +
      `*Estimated time:* ${estimatedTime}\n` +
      `*Fees:*\n${fees}\n\n` +
      `Confirm this swap?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('✅ Confirm', 'confirm_swap')], cancelButtonRow])
    }
  )

  return ctx.wizard.next()
})

// Confirm swap — call API with dry: false using the selected route's providers
swapWizard.action('confirm_swap', async ctx => {
  const { assetIn, assetOut, amount, destinationAddress, refundAddress, quote } = ctx.scene.session

  if (!assetIn || !assetOut || !amount || !destinationAddress || !refundAddress || !quote) {
    await ctx.answerCbQuery('Session expired. Please start again with /swap.')
    return ctx.scene.leave()
  }

  await ctx.answerCbQuery('Processing swap...')
  await ctx.editMessageText('⏳ Confirming swap...')

  try {
    const quoteResponse = await fetchQuote({
      sellAsset: assetIn.identifier,
      buyAsset: assetOut.identifier,
      sellAmount: amount.toString(),
      destinationAddress,
      refundAddress,
      providers: quote.providers,
      dry: false
    })

    if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
      await ctx.reply('❌ Swap failed: no routes available. Please try again with /swap.')
      return ctx.scene.leave()
    }

    const route = quoteResponse.routes[0]

    if (!route.qrCodeDataURL) {
      await ctx.reply('❌ Swap confirmed but no QR code received. Please contact support.')
      return ctx.scene.leave()
    }

    // Convert data URL to Buffer
    const base64Data = route.qrCodeDataURL.replace(/^data:image\/png;base64,/, '')
    const qrBuffer = Buffer.from(base64Data, 'base64')

    const inboundAddress = route.inboundAddress || route.targetAddress

    await ctx.replyWithPhoto(
      { source: qrBuffer },
      {
        caption:
          `✅ *Swap Confirmed!*\n\n` +
          `📱 *Send your ${assetIn.name}*\n\n` +
          `*Amount:* ${amount} ${assetIn.name}\n` +
          `*You will receive:* ~${route.expectedBuyAmount} ${assetOut.name}\n` +
          `*Send to:*\n\`${inboundAddress}\`\n\n` +
          `*Provider:* ${route.providers.join(', ')}\n` +
          `⏳ *Estimated time:* ${formatTime(route.estimatedTime.total)}\n\n` +
          `Scan the QR code or copy the address above.`,
        parse_mode: 'Markdown'
      }
    )

    return ctx.scene.leave()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap] Confirm error:', error)
    await ctx.reply(`❌ Swap confirmation failed: ${errMsg}\n\nPlease try again with /swap.`)
    return ctx.scene.leave()
  }
})

// Cancel swap (inline button)
swapWizard.action('cancel_swap', async ctx => {
  return cancelAndLeave(ctx)
})

export { swapWizard }

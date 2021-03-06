import { ArgumentParserResult } from '../types/Parser'
import ArgumentParser from './ArgumentParser'
import ParsingError from '../types/ParsingError'
import StringReader from '../utils/StringReader'
import Token, { TokenType } from '../types/Token'
import StringNode from '../types/nodes/StringNode'
import { NodeRange } from '../types/nodes/ArgumentNode'
import { LintConfig } from '../types/Config'
import { DiagnosticConfig } from '../types/StylisticConfig'
import QuoteTypeConfig from '../types/QuoteTypeConfig'
import ParsingContext from '../types/ParsingContext'
import { quoteString, validateStringQuote, arrayToMessage } from '../utils/utils'
import { locale } from '../locales/Locales'

export default class StringArgumentParser extends ArgumentParser<StringNode> {
    static identity = 'String'
    readonly identity = 'string'

    constructor(
        private readonly type: StringType = StringType.String,
        private readonly options: string[] | null = null,
        private readonly quote: keyof LintConfig | DiagnosticConfig<boolean> = null,
        private readonly quoteType: keyof LintConfig | DiagnosticConfig<QuoteTypeConfig> = null
    ) { super() }

    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<StringNode> {
        const ans: ArgumentParserResult<StringNode> = {
            data: new StringNode('', '', {}),
            tokens: [],
            errors: [],
            cache: {},
            completions: []
        }
        const start = reader.cursor

        //#region Data.
        try {
            switch (this.type) {
                case StringType.Greedy:
                    ans.data.value = reader.readRemaining()
                    break
                case StringType.String:
                    ans.data.value = reader.readString({ mapping: ans.data.mapping })
                    break
                case StringType.Unquoted:
                default:
                    ans.data.value = reader.readUnquotedString({ mapping: ans.data.mapping })
                    break
            }
        } catch (e) {
            /* istanbul ignore next */
            ans.errors = [e]
        }

        ans.data[NodeRange] = { start, end: reader.cursor }
        ans.data.raw = reader.string.slice(start, reader.cursor)
        //#endregion

        //#region Errors.
        /// Quotation marks.
        /* istanbul ignore next */
        const quote = typeof this.quote === 'string' ? ctx.config.lint[this.quote] as DiagnosticConfig<boolean> : this.quote
        /* istanbul ignore next */
        const quoteType = typeof this.quoteType === 'string' ? ctx.config.lint[this.quoteType] as DiagnosticConfig<QuoteTypeConfig> : this.quoteType
        ans.errors.push(...validateStringQuote(ans.data.raw, ans.data.value, ans.data[NodeRange], quote, quoteType))
        /// Unknown values.
        if (this.options && !this.options.includes(ans.data.value)) {
            ans.errors.push(
                new ParsingError(
                    { start, end: reader.cursor },
                    locale('expected-got',
                        arrayToMessage(this.options, true, 'or'),
                        locale('punc.quote', ans.data.value)
                    )
                )
            )
        }
        //#endregion

        //#region Completions.
        if (this.options && start <= ctx.cursor && ctx.cursor <= reader.cursor) {
            const firstChar = reader.string.charAt(start)
            const currentType = StringReader.isQuote(firstChar) ?
                (firstChar === '"' ? 'always double' : 'always single') :
                null
            for (const option of this.options) {
                let insertText: string
                if (currentType) {
                    insertText = quoteString(option, currentType, true).slice(1, -1)
                } else {
                    insertText = quoteString(option, quoteType ? quoteType[1] : 'prefer double', quote ? quote[1] : false)
                }
                ans.completions.push({ insertText, label: option })
            }
        }
        //#endregion

        ans.tokens.push(Token.from(start, reader, TokenType.string))

        return ans
    }
}

export const enum StringType {
    Unquoted, String, Greedy
}

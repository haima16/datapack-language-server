import { ArgumentParserResult } from '../types/Parser'
import { DiagnosticSeverity } from 'vscode-languageserver'
import { getCompletions, getSafeCategory } from '../types/ClientCache'
import ArgumentParser from './ArgumentParser'
import ParsingContext from '../types/ParsingContext'
import ParsingError from '../types/ParsingError'
import StringReader from '../utils/StringReader'
import { locale } from '../locales/Locales'
import Token, { TokenType } from '../types/Token'

export default class TagArgumentParser extends ArgumentParser<string> {
    static identity = 'Tag'
    readonly identity = 'tag'

    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<string> {
        const ans: ArgumentParserResult<string> = {
            data: '',
            tokens: [],
            errors: [],
            cache: {},
            completions: []
        }
        //#region Completions
        if (reader.cursor === ctx.cursor) {
            ans.completions.push(...getCompletions(ctx.cache, 'tags'))
        }
        //#endregion
        const category = getSafeCategory(ctx.cache, 'tags')
        //#region Data
        const start = reader.cursor
        const value = reader.readUnquotedString()
        ans.data = value
        //#endregion
        //#region Tokens
        ans.tokens.push(Token.from(start, reader, TokenType.variable))
        //#endregion
        //#region Errors
        if (!value) {
            ans.errors.push(new ParsingError(
                { start, end: start + 1 },
                locale('expected-got',
                    locale('tag'),
                    locale('nothing')
                ),
                false
            ))
        } else if (ctx.config.lint.strictTagCheck && !Object.keys(category).includes(value)) {
            ans.errors.push(new ParsingError(
                { start, end: start + value.length },
                locale('undefined-tag', locale('punc.quote', value)),
                undefined,
                DiagnosticSeverity.Warning
            ))
        }
        //#endregion
        //#region Cache
        if (Object.keys(category).includes(value)) {
            ans.cache = {
                tags: {
                    [value]: {
                        def: [],
                        ref: [{ start, end: start + value.length }]
                    }
                }
            }
        }
        //#endregion
        return ans
    }

    getExamples(): string[] {
        return ['foo']
    }
}

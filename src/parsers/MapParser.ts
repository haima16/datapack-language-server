import { ArgumentParserResult, combineArgumentParserResult } from '../types/Parser'
import StringReader from '../utils/StringReader'
import TextRange from '../types/TextRange'
import ParsingContext from '../types/ParsingContext'
import MapNode, { UnsortedKeys } from '../types/nodes/map/MapNode'
import { NodeRange } from '../types/nodes/ArgumentNode'

export default class MapParser<T extends MapNode<any, any>> {
    static readonly identity = 'Map'
    readonly identity = 'map'

    constructor(
        private readonly chars: {
            openBracket: string,
            sep: string,
            pairSep: string,
            closeBracket: string
        },
        private readonly parseKeyResult: (ans: ArgumentParserResult<T>, reader: StringReader, ctx: ParsingContext) => ArgumentParserResult<string>,
        private readonly parseValue: (ans: ArgumentParserResult<T>, reader: StringReader, ctx: ParsingContext, key: string, keyRange: TextRange) => void
    ) { }

    /* istanbul ignore next */
    parse(ans: ArgumentParserResult<T>, reader: StringReader, ctx: ParsingContext) {
        let { cursor } = ctx

        const start = reader.cursor

        /**
         * Move cursor to the end of the white spaces, so that we can provide
         * completions when the cursor is inside the white spaces.
         */
        const skipWhiteSpace = () => {
            const whiteSpaceStart = reader.cursor
            reader.skipWhiteSpace()
            if (whiteSpaceStart <= cursor && cursor < reader.cursor) {
                cursor = reader.cursor
            }
        }

        try {
            // Open BracketToken.
            reader
                .expect(this.chars.openBracket)
                .skip()

            while (true) {
                skipWhiteSpace()

                // Key StringToken.
                const keyStart = reader.cursor
                const keyResult = this.parseKeyResult(ans, reader, ctx)
                const key = keyResult.data
                const keyEnd = reader.cursor
                ans.completions.push(...keyResult.completions)
                if (!(reader.canRead() && reader.peek() !== this.chars.closeBracket)) {
                    break
                }
                keyResult.completions = []
                combineArgumentParserResult(ans, keyResult)

                // Key value SepToken.
                reader
                    .skipWhiteSpace()
                    .expect(this.chars.sep)
                    .skip()
                skipWhiteSpace()

                // Value Token.
                ans.data[UnsortedKeys].push(key)
                this.parseValue(ans, reader, ctx, key, { start: keyStart, end: keyEnd })

                reader.skipWhiteSpace()

                // Key-value pair SepToken.
                if (reader.peek() === this.chars.pairSep) {
                    reader
                        .skip()
                        .skipWhiteSpace()
                    continue
                }
                break
            }

            // Close BracketToken.
            reader
                .skipWhiteSpace()
                .expect(this.chars.closeBracket)
                .skip()
        } catch (p) {
            ans.errors.push(p)
        }

        ans.data[NodeRange] = { start, end: reader.cursor }

        return ans
    }
}

import FunctionInfo from '../../types/FunctionInfo'
import { DocumentLink } from 'vscode-languageserver'
import { isFileType, CacheUnit } from '../../types/ClientCache'
import { UrisOfStrings, UrisOfIds, PathExistsFunction, Uri } from '../../types/handlers'
import IdentityNode from '../../types/nodes/IdentityNode'
import { getUriFromId } from './common'

export default async function onDocumentLinks({ info, roots, uris, urisOfIds, pathExists }: { info: FunctionInfo, roots: Uri[], uris: UrisOfStrings, urisOfIds: UrisOfIds, pathExists: PathExistsFunction }) {
    const ans: DocumentLink[] = []

    for (let i = 0; i < info.lines.length; i++) {
        const { cache } = info.lines[i]
        for (const type in cache) {
            if (isFileType(type)) {
                const category = cache[type]
                for (const id in category) {
                    /* istanbul ignore next */
                    if (category.hasOwnProperty(id)) {
                        const unit = category[id] as CacheUnit
                        const ref = [...unit.def, ...unit.ref]
                        for (const pos of ref) {
                            const link = {
                                range: {
                                    start: { line: i, character: pos.start },
                                    end: { line: i, character: pos.end }
                                },
                                target: await getUriFromId(pathExists, roots, uris, urisOfIds, IdentityNode.fromString(id), type)
                            }
                            /* istanbul ignore next */
                            if (link.target) {
                                ans.push({ range: link.range, target: link.target.toString() })
                            }
                        }
                    }
                }
            }
        }
    }

    return ans
}

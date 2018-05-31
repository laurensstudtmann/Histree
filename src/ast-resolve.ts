import{
  NodeyCode
} from './nodey'

import * as CodeMirror
  from 'codemirror';

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import * as crypto from 'crypto';


export
class ASTResolve{

  repairAST(nodey : NodeyCode, change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    var range = this.solveRange(change, editor) // first convert code mirror coordinates to our coordinates
    var affected = this.findAffectedChild(nodey.content, 0, Math.max(0, nodey.content.length - 1), range)
    affected = affected || nodey // if there's no specific node broken, the whole cell node is broken

    // shift all nodey positions after affected
    var newEnd = this.repairPositions(affected, change)

    // return the text from this node's new range
    var text = editor.doc.getRange(affected.start, newEnd)
    var updateID = crypto.randomBytes(20).toString('hex');
    affected.pendingUpdate = updateID
    console.log("The exact affected nodey is", affected, text)

    var kernel_reply = this.recieve_newVersion.bind(this, affected, updateID)
    return [kernel_reply, text]
  }

  /*
  * Convert into full line ranges, to increase the likelihood that we get a nodey that the python
  * parser can parse (it fails on random little snippets)
  */
  solveRange(change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    var lineRange = {'start': {'line': change.from.line, 'ch': change.from.ch}, 'end': {'line': change.to.line, 'ch': change.to.ch}}
    lineRange.start.ch = 0
    lineRange.end.ch = editor.doc.getLine(change.to.line).length
    return lineRange
  }


  findAffectedChild(list: NodeyCode[], min: number, max: number, change: {'start': any, 'end': any}) :  NodeyCode
  {
    var mid = Math.round((max - min)/2) + min
    var direction = this.inRange(list[mid], change)

    if((min >= max || max <= min) && direction !== 0) //end condition no more to explore
      return null

    if(direction === 0) // it's in this node, check for children to be more specific
    {
      if(list[mid].content.length < 1)
        return list[mid] // found!
      else
        return this.findAffectedChild(list[mid].content, 0, Math.max(0, list[mid].content.length - 1), change) || list[mid] // found!
    }
    else if(direction === 2)
      return null // there is no match at this level
    else if(direction === -1) // check the left
      return this.findAffectedChild(list, min, mid - 1, change)
    else if(direction === 1) // check the right
      return this.findAffectedChild(list, mid + 1, max, change)
  }


  repairPositions(affected : NodeyCode, change : CodeMirror.EditorChange) : {'line': number, 'ch': number}
  {
    // shift all nodes after this changed node
    var [nodeEnd , deltaLine, deltaCh] = this.calcShift(affected, change)
    if(affected.right)
    {
      if(affected.right.start.line !== nodeEnd.line)
        deltaCh = 0
      this.shiftAllAfter(affected.right, deltaLine, deltaCh)
    }
    return nodeEnd
  }


  calcShift(affected : NodeyCode, change : CodeMirror.EditorChange): [{'line': number, 'ch': number}, number, number]
  {
    var nodeEnd = affected.end

    // calculate deltas
    var deltaLine = 0
    var deltaCh = 0

    var added_line = change.text.length
    var removed_line = change.removed.length
    deltaLine = added_line - removed_line

    var added_ch = (change.text[Math.max(change.text.length - 1, 0)] || "").length
    var removed_ch = (change.removed[Math.max(change.removed.length - 1, 0)] || "").length
    deltaCh = added_ch - removed_ch

    // need to calculate: change 'to' line is not dependable because it is before coordinates only
    var endLine = change.from.line + deltaLine

    // update this node's coordinates
    if(endLine === nodeEnd.line)
      nodeEnd.ch = nodeEnd.ch + deltaCh
    else
      nodeEnd.line  = nodeEnd.line + deltaLine

    return [nodeEnd, deltaLine, deltaCh]
  }


  shiftAllAfter(nodey: NodeyCode, deltaLine: number, deltaCh: number) : void
  {
    if(deltaLine === 0 && deltaCh === 0)//no more shifting, stop
      return

    console.log("Shifting ", nodey, "by", deltaLine, " ", deltaCh, " before:"+nodey.start.line+" "+nodey.start.ch)
    nodey.start.line += deltaLine
    nodey.end.line += deltaLine
    nodey.start.ch += deltaCh

    //Now be sure to shift all children
    this.shiftAllChildren(nodey, deltaLine, deltaCh)

    var rightSibling = nodey.right
    if(rightSibling)
    {
      if(rightSibling.start.line !== nodey.start.line)
        deltaCh = 0
      this.shiftAllAfter(rightSibling, deltaLine, deltaCh)
    }
  }


  shiftAllChildren(nodey: NodeyCode, deltaLine: number, deltaCh: number) : void
  {
    for(var i in nodey.content)
    {
      var child = nodey.content[i]
      child.start.line += deltaLine
      child.end.line += deltaLine
      child.start.ch += deltaCh
      this.shiftAllChildren(child, deltaLine, deltaCh)
    }
  }


  //return 0 for match, 1 for to the right, -1 for to the left, 2 for both
  inRange(nodey : NodeyCode, change: {'start': any, 'end': any}) : number
  {
    var val = 0
    if(change.start.line < nodey.start.line)
      val = -1
    else if(change.start.line === nodey.start.line && change.start.ch < nodey.start.ch)
      val = -1

    if(change.end.line > nodey.end.line)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    else if(change.end.line === nodey.end.line && change.end.ch > nodey.end.ch)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    return val
  }


  recieve_newVersion(node: NodeyCode, updateID: string, jsn: string) : NodeyCode
  {
    if(node.pendingUpdate && node.pendingUpdate === updateID)
    {
      console.log("Time to resolve", jsn, "with", node)

    }
    return node
  }
}

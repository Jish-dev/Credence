export function pagination(query:any) {
 const page=Math.max(1,Number(query.page)||1), limit=Math.min(100,Math.max(1,Number(query.limit)||20));
 return {page,limit,skip:(page-1)*limit};
}
